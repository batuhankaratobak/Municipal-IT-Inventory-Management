document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("token")) {
        window.location.href = "index.html";
        return;
    }

    applyRoleUi();

    fetchProducts();
    loadCategories(); // Sayfa yüklendiğinde kategorileri yükle
    loadDepartments();

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("productId");
    if (productId) {
        openProductForm(productId);
    }
});

const API_BASE_URL = "http://localhost:3000";

function getCurrentRole() {
    return localStorage.getItem("role") || "";
}

function applyRoleUi() {
    const role = getCurrentRole();
    const username = localStorage.getItem("username") || "Kullanıcı";

    document.getElementById("currentUsername").innerText = username;
    document.getElementById("userRole").innerText = role.toUpperCase();

    const usersLink = document.querySelector('[data-role-link="users"]');
    const logsLink = document.querySelector('[data-role-link="logs"]');

    if (usersLink) usersLink.style.display = role === "super_admin" ? "" : "none";
    if (logsLink) logsLink.style.display = ["super_admin", "admin"].includes(role) ? "" : "none";
}

// API'den ürünleri çek ve tabloya ekle
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: "GET",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("API'den geçerli bir yanıt alınamadı.");

        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error("Ürünleri çekerken hata:", error);
    }
}

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json"
    };
}

// Ürünleri tabloya ekle
function renderProducts(products) {
    const tableBody = document.getElementById("productTable");
    tableBody.innerHTML = ""; 

    const fragment = document.createDocumentFragment();
    const canDelete = getCurrentRole() === "super_admin";
    
    products.forEach(product => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.product_id}</td> <!-- ID -->
            <td>${product.product_name}</td> <!-- Ürün Adı -->
            <td>${product.department_name}</td> <!-- Departman -->
            <td>${product.warranty_period}</td> <!-- Garanti Süresi -->
            <td>${product.brand}</td> <!-- Marka -->
            <td>${product.model}</td> <!-- Model -->
            <td>${product.serial_number}</td> <!-- Seri No -->
            <td>${product.barcode}</td> <!-- Barkod -->
            <td>
                <button class="btn btn-warning btn-sm" onclick="openProductForm(${product.product_id})">Düzenle</button>
                ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${product.product_id})">Sil</button>` : ""}
            </td>`;
        fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
}

function closeProductForm() {
    document.getElementById("productForm").style.display = "none";
}

// Ürünleri arama
function searchProducts() {
    const query = document.getElementById('search').value.toLowerCase();
    const rows = document.querySelectorAll('#productTable tr');
    rows.forEach(row => {
        const cells = row.getElementsByTagName('td');
        const productName = cells[1].textContent.toLowerCase();
        if (productName.indexOf(query) !== -1) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Ürün ekleme veya düzenleme formunu aç
function openProductForm(id = null) {
    document.getElementById("productForm").style.display = "block";
    document.getElementById("formTitle").innerText = id ? "Ürünü Düzenle" : "Yeni Ürün Ekle";

    if (id) {
        console.log("Düzenleme işlemi için açılan form, ID:", id);

        fetch(`${API_BASE_URL}/products/${id}`, { headers: getAuthHeaders() })
            .then(response => response.json())
            .then(product => {
                console.log("Backend’den Gelen Ürün:", product); // Debugging log

                if (!product || !product.product_id) {
                    console.error("Hata: Ürün bilgileri alınamadı.");
                    return;
                }

                document.getElementById("productId").value = product.product_id;
                document.getElementById("productName").value = product.product_name || "";
                document.getElementById("productDepartment").value = product.department_name || "";
                document.getElementById("productWarranty").value = product.warranty_period || ""; // GARANTİ SÜRESİ DOĞRU YERE
                document.getElementById("productBrand").value = product.brand || ""; // MARKA
                document.getElementById("productModel").value = product.model || ""; // MODEL
                document.getElementById("productSerialNumber").value = product.serial_number || "";
                document.getElementById("productBarcode").value = product.barcode || "";
                document.getElementById("categorySelect").value = product.category_id || "";
                document.getElementById("userFirstName").value = product.user_first_name || "";
                document.getElementById("userLastName").value = product.user_last_name || "";
            })
            .catch(error => console.error("Ürün bilgisi alınırken hata:", error));
    } else {
        console.log("Yeni ürün ekleme modu açıldı.");
        document.getElementById("productId").value = "";
        document.getElementById("productName").value = "";
        document.getElementById("productDepartment").value = "";
        document.getElementById("productWarranty").value = ""; // GARANTİ SÜRESİ DOĞRU YERE
        document.getElementById("productBrand").value = "";
        document.getElementById("productModel").value = "";
        document.getElementById("productSerialNumber").value = "";
        document.getElementById("productBarcode").value = "";
        document.getElementById("categorySelect").value = "";
        document.getElementById("userFirstName").value = "";
        document.getElementById("userLastName").value = "";
    }
}

// Ürün ekleme veya güncelleme
async function saveProduct() {
    const productIdElem = document.getElementById("productId");
    const id = productIdElem ? productIdElem.value.trim() : null;

    console.log("Güncellenecek Ürün ID:", id); // Debugging Log

    if (id && isNaN(id)) {
        console.error("Hata: Geçersiz ürün ID:", id);
        return;
    }

    const serialNumber = document.getElementById("productSerialNumber").value.trim();
    const barcode = document.getElementById("productBarcode").value.trim() || serialNumber;

    const productData = {
        product_name: document.getElementById("productName").value.trim(),
        department_name: document.getElementById("productDepartment").value.trim(),
        warranty_period: document.getElementById("productWarranty").value.trim(),
        brand: document.getElementById("productBrand").value.trim(),
        model: document.getElementById("productModel").value.trim(),
        serial_number: serialNumber,
        barcode: barcode,
        category_id: document.getElementById("categorySelect").value.trim() || null,
        user_first_name: document.getElementById("userFirstName").value.trim(),
        user_last_name: document.getElementById("userLastName").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/products/${id ? id : ''}`, {
            method: id ? "PUT" : "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(productData)
        });

        if (!response.ok) throw new Error("Ürün ekleme/düzenleme başarısız!");

        console.log("Ürün başarıyla güncellendi veya eklendi.");
        closeProductForm();
        fetchProducts();
    } catch (error) {
        console.error("Ürün eklerken/düzenlerken hata:", error);
    }
}

// Ürün silme
async function deleteProduct(id) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error("Ürün silinemedi!");

        fetchProducts();
    } catch (error) {
        console.error("Ürün silerken hata:", error);
    }
}

// Kategorileri dropdown'a yüklemek için fonksiyon
async function loadCategories() {
    const response = await fetch(`${API_BASE_URL}/getCategories`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        console.error("Kategoriler yüklenemedi.");
        return;
    }

    const categories = await response.json();

    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="">Kategori seçiniz</option>';
    
    // Kategorileri dropdown menüsüne ekle
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.category_id;
        option.textContent = category.category_name;
        categorySelect.appendChild(option);
    });
}

async function loadDepartments() {
    const response = await fetch(`${API_BASE_URL}/departments`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        console.error("Departmanlar yüklenemedi.");
        return;
    }

    const departments = await response.json();
    const departmentSelect = document.getElementById('productDepartment');
    departmentSelect.innerHTML = '<option value="">Departman seçiniz</option>';

    departments.forEach(department => {
        const option = document.createElement('option');
        option.value = department.department_name;
        option.textContent = department.department_name;
        departmentSelect.appendChild(option);
    });
}

// Çıkış yap fonksiyonu
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    window.location.href = "index.html";
}
