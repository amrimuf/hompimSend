# HompimSend Backend

## Installation

```bash
# Clone the repository
git clone https://github.com/amrimuf/hompimSend

# Navigate to the project directory
cd hompimSend

# Install dependencies
yarn

# Build the project
yarn build

# Copy the .env.example file and rename it to .env
cp .env.example .env

# Configure environment variables on the .env file

# Start PostgreSQL using Docker Compose (Optional):
docker-compose up -d

# Run the database migration
npx prisma migrate dev

# or Push the database schema
npx prisma db push

# Install git (pre-commit) hooks
npx husky install
```

## Usage

```bash
# Run the project in development mode
yarn dev

# Start the production server
yarn start
```
