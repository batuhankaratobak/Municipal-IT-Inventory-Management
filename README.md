# Inventory Management Application

A local inventory management application designed for municipal IT operations.

The application is built with Electron, Node.js, Express, and PostgreSQL. It is intended to manage devices, equipment, assignments, department transfers, maintenance records, barcode scanning, and audit logs from a single local system.

## Features

- User login and role-based access control
- Roles: `super_admin`, `admin`, `tech`
- Inventory create, update, and delete flows
- Automatic barcode generation
- Product lookup by barcode or serial number
- Field scanning screen for tablets or barcode scanners
- Department and assignee transfer tracking
- Maintenance and issue record creation
- Maintenance history and movement history
- Audit logs showing who performed which action and when
- Preloaded sample department list for municipal inventory workflows

## Roles

### super_admin

- Can create admin and tech users
- Can delete users
- Can update user roles
- Cannot delete their own account or change their own role
- Can view audit logs
- Can create, update, and delete inventory records

### admin

- Can create inventory records
- Can update inventory records
- Can view audit logs

### tech

- Can create inventory records
- Can update inventory records
- Can use the barcode scanning screen
- Can create maintenance records and transfer records

## Installation

Requirements:

- Node.js
- PostgreSQL 15+

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and update it with your local PostgreSQL settings:

```bash
cp .env.example .env
```

Create the database, tables, departments, and initial user:

```bash
npm run setup-db
```

Start the application:

```bash
npm start
```

## Initial Login

Default initial user:

```text
Username: superadmin
Password: value of SEED_ADMIN_PASSWORD in .env
```

Change the initial password after setup.

## Barcode Workflow

1. An inventory record is created.
2. If the barcode field is left empty, the system generates a barcode automatically.
3. The generated barcode is printed as a sticker and attached to the device.
4. A tech user scans the barcode in the field.
5. The system shows the device brand, model, serial number, department, and assignee.
6. A maintenance record can be created if needed.
7. A department or assignee transfer can be created if needed.
8. All actions are written to the audit logs.

## Security

- Do not commit `.env` to GitHub.
- Do not commit `node_modules`.
- Do not expose PostgreSQL to the public internet.
- For municipal/internal use, the backend should only be reachable from the local network.
- Prefer `scram-sha-256` for PostgreSQL password authentication.
- Enable FileVault on macOS.
- Store backups encrypted.

Detailed security and field workflow notes:

[SECURITY_AND_WORKFLOW.md](./SECURITY_AND_WORKFLOW.md)

## Important Files

- `server.js`: Backend API
- `main.js`: Electron entry point
- `dashboard.html` / `dashboard.js`: Main inventory panel
- `scan.html` / `scan.js`: Barcode scanning and field operations screen
- `kullanıcı.html` / `kullanıcı.js`: User management
- `log.html` / `log.js`: Audit logs
- `PostgreSQL.sql`: Database schema and seed data
- `scripts/setup-db.js`: Database setup script

## Before Publishing to GitHub

Do not publish:

- `.env`
- `node_modules/`
- Local launcher files
- Database dumps or backup files
- Files containing real institutional data

Safe to publish:

- Source code files
- `package.json`
- `package-lock.json`
- `.env.example`
- `PostgreSQL.sql`
- Documentation files
