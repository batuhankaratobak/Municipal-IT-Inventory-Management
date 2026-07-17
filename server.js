require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in the environment');
}

app.use(express.json());
app.use(cors());

// PostgreSQL bağlantısı
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

function signToken(user) {
  return jwt.sign(
    { id: user.user_id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Oturum bulunamadı' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Oturum geçersiz veya süresi dolmuş' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    next();
  };
}

function getUserResponse(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role
  };
}

function normalizeBarcode(serialNumber, barcode) {
  const cleanBarcode = (barcode || '').trim();
  return cleanBarcode || generateBarcode();
}

function generateBarcode() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DMB-${y}${m}${d}-${random}`;
}

async function writeLog(client, { productId, operationType, previousData, newData, operator, changedPart }) {
  await client.query(
    `INSERT INTO logs (product_id, operation_type, previous_data, new_data, operation_date, operator, changed_part)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
    [
      productId || null,
      operationType,
      previousData || null,
      newData || null,
      operator || 'system',
      changedPart || null
    ]
  );
}

// Kullanıcı giriş API'si
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
    }

    const user = result.rows[0];
    const storedPassword = user.password || '';
    const isHashed = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');
    const passwordMatches = isHashed && await bcrypt.compare(password, storedPassword);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Hatalı şifre' });
    }

    res.json({ message: 'Giriş başarılı', token: signToken(user), role: user.role, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

pool.connect()
  .then(client => {
    console.log('Veritabanı bağlantısı başarılı');
    client.release();
  })
  .catch(err => {
    console.error('Veritabanı bağlantısı hatası:', err);
  });

app.get("/products", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY product_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error("Ürünleri çekerken hata:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});

// Yeni ürün ekleme
app.post("/products", authenticateToken, authorizeRoles('super_admin', 'admin', 'tech'), async (req, res) => {
  const {
    product_name,
    product_description,
    warranty_period,
    department_name,
    user_first_name,
    user_last_name,
    barcode,
    product_type,
    category_id,
    part,
    brand,
    model,
    serial_number,
    capacity,
    purchase_date,
    last_update_date
  } = req.body;

  const finalBarcode = normalizeBarcode(serial_number, barcode);

  if (!product_name) {
    return res.status(400).json({ message: "Ürün adı zorunludur" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO products 
      (product_name, product_description, warranty_period, department_name, user_first_name, user_last_name, barcode, 
       product_type, category_id, part, brand, model, serial_number, capacity, purchase_date, last_update_date)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *`,
      [
        product_name,
        product_description || "",  // Eğer frontend'de boşsa hata almamak için default değer
        warranty_period || "",
        department_name || "",
        user_first_name || "",
        user_last_name || "",
        finalBarcode,
        product_type || "",
        category_id || null,  // Eğer frontend boş gönderdiyse null at
        part || "",
        brand || "",
        model || "",
        serial_number || null,  // Eğer frontend boş gönderdiyse null at
        capacity || "",
        purchase_date || null,
        last_update_date || null
      ]
    );

    await writeLog(client, {
      productId: result.rows[0].product_id,
      operationType: 'CREATE_PRODUCT',
      newData: result.rows[0],
      operator: req.user.username,
      changedPart: 'products'
    });

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Ürün eklerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});


// Ürün güncelleme
app.put("/products/:id(\\d+)", authenticateToken, authorizeRoles('super_admin', 'admin', 'tech'), async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Geçersiz ürün ID!" });
  }

  const {
    product_name,
    department_name,
    warranty_period,
    brand,
    model,
    serial_number,
    barcode,
    category_id,
    user_first_name,
    user_last_name
  } = req.body;

  const finalBarcode = normalizeBarcode(serial_number, barcode);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const previous = await client.query("SELECT * FROM products WHERE product_id = $1", [id]);
    if (previous.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    const result = await client.query(
      `UPDATE products 
       SET product_name = $1, department_name = $2, warranty_period = $3, 
           brand = $4, model = $5, serial_number = $6, barcode = $7,
           category_id = $8, user_first_name = $9, user_last_name = $10,
           last_update_date = NOW() 
       WHERE product_id = $11 RETURNING *`,
      [
        product_name,
        department_name,
        warranty_period,
        brand,
        model,
        serial_number || null,
        finalBarcode,
        category_id || null,
        user_first_name || "",
        user_last_name || "",
        id
      ]
    );

    await writeLog(client, {
      productId: result.rows[0].product_id,
      operationType: 'UPDATE_PRODUCT',
      previousData: previous.rows[0],
      newData: result.rows[0],
      operator: req.user.username,
      changedPart: 'products'
    });

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Ürün güncellerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});


// Tek bir ürünü ID ile getir
app.get("/products/:id(\\d+)", authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: "Geçersiz ürün ID!" });
  }

  try {
    const result = await pool.query("SELECT * FROM products WHERE product_id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ürün bilgisi alınırken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

app.get("/products/barcode/:barcode", authenticateToken, async (req, res) => {
  const { barcode } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE barcode = $1 OR serial_number = $1",
      [barcode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Barkoda ait ürün bulunamadı" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Barkod ile ürün aranırken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});


// Ürün silme
app.delete("/products/:id(\\d+)", authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Ürün ID belirtilmeli!" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      "DELETE FROM products WHERE product_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    await writeLog(client, {
      productId: null,
      operationType: 'DELETE_PRODUCT',
      previousData: result.rows[0],
      operator: req.user.username,
      changedPart: 'products'
    });

    await client.query('COMMIT');
    res.json({ message: "Ürün başarıyla silindi" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Ürün silerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

app.get("/products/:id(\\d+)/maintenance", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT *
       FROM maintenance_records
       WHERE product_id = $1
       ORDER BY created_at DESC, maintenance_id DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Arıza kayıtları alınırken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

app.post("/products/:id(\\d+)/maintenance", authenticateToken, authorizeRoles('super_admin', 'admin', 'tech'), async (req, res) => {
  const { id } = req.params;
  const { issue_title, issue_description, status, resolution_note } = req.body;

  if (!issue_title) {
    return res.status(400).json({ message: "Arıza başlığı zorunludur" });
  }

  const recordStatus = status || 'open';
  const allowedStatuses = ['open', 'in_progress', 'resolved'];

  if (!allowedStatuses.includes(recordStatus)) {
    return res.status(400).json({ message: "Geçersiz arıza durumu" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const product = await client.query("SELECT * FROM products WHERE product_id = $1", [id]);
    if (product.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    const result = await client.query(
      `INSERT INTO maintenance_records
       (product_id, issue_title, issue_description, status, resolution_note, created_by, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $4 = 'resolved' THEN NOW() ELSE NULL END)
       RETURNING *`,
      [id, issue_title, issue_description || "", recordStatus, resolution_note || "", req.user.username]
    );

    await writeLog(client, {
      productId: Number(id),
      operationType: 'CREATE_MAINTENANCE',
      newData: result.rows[0],
      operator: req.user.username,
      changedPart: 'maintenance_records'
    });

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Arıza kaydı oluşturulurken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

app.get("/products/:id(\\d+)/movements", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT *
       FROM product_movements
       WHERE product_id = $1
       ORDER BY moved_at DESC, movement_id DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Transfer geçmişi alınırken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

app.post("/products/:id(\\d+)/transfer", authenticateToken, authorizeRoles('super_admin', 'admin', 'tech'), async (req, res) => {
  const { id } = req.params;
  const {
    to_department_name,
    to_user_first_name,
    to_user_last_name,
    note
  } = req.body;

  if (!to_department_name) {
    return res.status(400).json({ message: "Yeni departman zorunludur" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const previous = await client.query("SELECT * FROM products WHERE product_id = $1", [id]);
    if (previous.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Ürün bulunamadı" });
    }

    const oldProduct = previous.rows[0];
    const movement = await client.query(
      `INSERT INTO product_movements
       (product_id, from_department_name, to_department_name, from_user_first_name, from_user_last_name,
        to_user_first_name, to_user_last_name, note, moved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        oldProduct.department_name || "",
        to_department_name,
        oldProduct.user_first_name || "",
        oldProduct.user_last_name || "",
        to_user_first_name || "",
        to_user_last_name || "",
        note || "",
        req.user.username
      ]
    );

    const updated = await client.query(
      `UPDATE products
       SET department_name = $1,
           user_first_name = $2,
           user_last_name = $3,
           last_update_date = NOW()
       WHERE product_id = $4
       RETURNING *`,
      [to_department_name, to_user_first_name || "", to_user_last_name || "", id]
    );

    await writeLog(client, {
      productId: Number(id),
      operationType: 'TRANSFER_PRODUCT',
      previousData: oldProduct,
      newData: {
        product: updated.rows[0],
        movement: movement.rows[0]
      },
      operator: req.user.username,
      changedPart: 'products.department_assignment'
    });

    await client.query('COMMIT');
    res.status(201).json({ product: updated.rows[0], movement: movement.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Transfer kaydı oluşturulurken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

// Kategori göster
app.get('/getCategories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT category_id, category_name FROM product_categories ORDER BY category_name');
    res.json(result.rows);
  } catch (error) {
    console.error("Veritabanı sorgusu başarısız!", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get('/departments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT department_id, department_name, manager_name, phone, extension, email, source_url
       FROM departments
       ORDER BY department_name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Departmanları çekerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

app.get('/users', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username, role FROM users ORDER BY user_id');
    res.json(result.rows);
  } catch (error) {
    console.error("Kullanıcıları çekerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

app.post('/users', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const { username, password, role } = req.body;
  const allowedRoles = ['admin', 'tech'];

  if (!username || !password || !allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Sadece admin veya tech kullanıcısı oluşturabilirsiniz" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
      [username, hashedPassword, role]
    );

    await writeLog(client, {
      operationType: 'CREATE_USER',
      newData: getUserResponse(result.rows[0]),
      operator: req.user.username,
      changedPart: 'users'
    });

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Kullanıcı eklerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

app.put('/users/:id/role', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const allowedRoles = ['admin', 'tech'];

  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ message: "Kendi rolünüzü değiştiremezsiniz" });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Rol sadece admin veya tech olabilir" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const previous = await client.query('SELECT user_id, username, role FROM users WHERE user_id = $1', [id]);
    if (previous.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const result = await client.query(
      'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id, username, role',
      [role, id]
    );

    await writeLog(client, {
      operationType: 'UPDATE_USER_ROLE',
      previousData: previous.rows[0],
      newData: result.rows[0],
      operator: req.user.username,
      changedPart: 'users.role'
    });

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Kullanıcı rolü güncellenirken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

app.delete('/users/:id', authenticateToken, authorizeRoles('super_admin'), async (req, res) => {
  const { id } = req.params;

  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({ message: "Kendi kullanıcınızı silemezsiniz" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, role',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    await writeLog(client, {
      operationType: 'DELETE_USER',
      previousData: result.rows[0],
      operator: req.user.username,
      changedPart: 'users'
    });

    await client.query('COMMIT');
    res.json({ message: "Kullanıcı silindi" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Kullanıcı silerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  } finally {
    client.release();
  }
});

app.get('/logs', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM logs ORDER BY operation_date DESC, log_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error("Logları çekerken hata:", error.message);
    res.status(500).json({ message: "Sunucu hatası", error: error.message });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Backend çalışıyor: http://localhost:${PORT}`);
});
