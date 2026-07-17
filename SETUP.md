# Inventory Application Setup

## Requirements

- Node.js
- PostgreSQL 15+

## Database

When PostgreSQL is running, the following script creates the database, tables, initial categories, departments, and the first super admin user:

```bash
npm run setup-db
```

If `npm` is not available, run the setup script directly with Node.js:

```bash
node scripts/setup-db.js
```

Default initial user:

- Username: `superadmin`
- Password: value of `SEED_ADMIN_PASSWORD` in `.env`
- Role: `super_admin`

These values can be changed through `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_ROLE` in `.env`. Change the initial password after the first setup.

## Application

After PostgreSQL is ready, start the Electron application:

```bash
npm start
```

When Electron starts, the backend starts automatically on:

```text
http://localhost:3000
```

