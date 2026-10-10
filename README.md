This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Running with Docker

Create a `.env` file in the project root with the passwords (it's gitignored, so it won't be committed):

```bash
ADMIN_PASSWORD=<admin-pw>
SITE_PASSWORD=<site-pw>
```

Then build and start:

```bash
docker build -t pickleball:latest .
docker compose up -d
```

To stop it:

```bash
docker compose down
```

The app runs at [http://localhost:3000](http://localhost:3000). The SQLite database is kept in the `db_data` volume, and migrations run automatically when the container starts.
