# Security and Barcode / Assignment Workflow

## Database and Application Security

This application stores internal municipal inventory data. The `index.html` file should not be opened directly. The application should be started through Electron, and the backend should run only on the selected local device or inside the municipal network.

## SQL File Location

Main SQL setup file:

```text
PostgreSQL.sql
```

This file contains the database tables, role rules, initial categories, and department seed data.

## Setup Files

- Database setup script: `scripts/setup-db.js`
- Environment variable example: `.env.example`
- Local runtime settings: `.env`
- Local launcher file: ignored by git and intended only for local development

## Encryption and Access Layers

PostgreSQL does not provide simple full database file encryption by itself. Use layered protection:

1. Enable FileVault on macOS.
2. Configure PostgreSQL to listen only on the required machine or internal network range.
3. Use `scram-sha-256` instead of `trust` in `pg_hba.conf`.
4. Connect the application to PostgreSQL with a dedicated, limited database user.
5. Store application user passwords with bcrypt hashes.
6. Do not share `.env` and do not commit it to git.
7. Store backups on encrypted disks or encrypted archives.
8. Keep tablets on the municipal network and, if possible, manage them with MDM or device policies.

## Roles

- `super_admin`: User management, audit logs, inventory create/update/delete.
- `admin`: Inventory create/update and audit log viewing.
- `tech`: Inventory create/update and field barcode scanning.

`super_admin` cannot create another `super_admin`. It can only create `admin` and `tech` users. It cannot delete itself or change its own role.

## Barcode Scenario

1. IT staff creates an inventory record.
2. The system generates a unique barcode automatically.
3. The barcode is printed as a sticker and attached to the device or under the keyboard.
4. A tech user visits the relevant department with a tablet.
5. The tech user scans the barcode in the scanning screen.
6. The system finds the product and displays:
   - Product name
   - Department
   - Assignee
   - Brand
   - Model
   - Serial number
   - Barcode
   - Warranty information
   - Last update date
7. If authorized, the user can edit the product.
8. The user can create a maintenance record or transfer the product to another department.
9. All actions are written to audit logs with the username.

## Added Field Modules

- `scan.html`: Barcode / serial number scanning screen.
- `maintenance_records`: Maintenance and issue records table.
- `product_movements`: Department and assignment movement history table.
- `/products/barcode/:barcode`: Find product by barcode or serial number.
- `/products/:id/maintenance`: View maintenance history and create new maintenance records.
- `/products/:id/transfer`: Transfer a product to a new department and assignee.

When a product is created and the barcode field is left empty, the system automatically generates a barcode in the `DMB-YYYYMMDD-XXXXXX` format. The serial number is stored separately and can also be used in the scanning screen.

## Tablet / Internal Municipal Use

Recommended secure model:

- Backend and PostgreSQL run on a fixed computer or mini server inside the municipality.
- Tablets connect to the same municipal Wi-Fi/VLAN.
- Tablets access only the internal backend address.
- No public internet ports are exposed.
- HTTPS and device-based access can be added later.

Initial single-computer local model:

```text
Electron application + localhost backend + localhost PostgreSQL
```

Target architecture for tablet-based internal use:

```text
Tablet browser/Electron client -> Internal HTTPS backend -> PostgreSQL
```

## Barcode Scanner Note

Most USB or Bluetooth barcode scanners behave like keyboards. When a barcode is scanned, the scanner types the barcode into the selected input field and usually sends Enter at the end. For this reason, the "Barcode Scan" screen works through a focused input field.
