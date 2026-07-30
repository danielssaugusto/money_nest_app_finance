# MoneyNest - Personal Finance Manager

A personal finance management application built with **Spring Boot** and **Vanilla JavaScript**.

## Quick Start

1. Configure your PostgreSQL database settings in `application.properties`.

2. Use the `.env.example` file as a reference and create a new `.env` file in the project root directory.

3. Configure your secret information and required environment variables in the `.env` file.

4. Generate a valid secret key for JWT authentication. You can use the following command:

    ````bash
    openssl rand -base64 64
    ````
5. Run the application:

    ````bash
    mvn spring-boot:run
    ````
6. Open the application in your browser:

    ````text
    http://localhost:8081
    ````
For more information, configuration details, or any questions, please refer to the project documentation.


## Documentation

For a detailed overview of the project architecture, code structure, business logic, and technical implementation, see:

- **[DOCUMENTATION.md](./DOCUMENTATION.md)** – English (EN)
- **[DOCUMENTACAO.md](./DOCUMENTACAO.md)** – Portuguese (PT-BR)

## Key Features

- **Financial Dashboard** – Track your balance, income, and expenses.
- **Dark Mode** – Switch between light and dark themes.
- **Privacy Mode** – Hide your financial information with a single click.
- **Monthly History** – Browse transactions by month and year.
- **Real-Time Search** – Instantly filter transactions as you type.

---
*This project was developed for personal finance management purposes.*
