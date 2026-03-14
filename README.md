# Antique Auction Platform

Full-stack web application for managing antique auctions with real-time bidding.

## Features

- Publish auction items with starting price and countdown timer
- Real-time bidding system with automatic winner detection
- Bidder information management (nickname, code, email, phone)
- Auction results display with winner information
- Bid history tracking in descending order
- Admin features (publish, delete items, clear history)
- Responsive aqua blue themed UI

## Tech Stack

- Backend: Node.js + Express
- Database: SQLite
- Frontend: HTML, CSS, Vanilla JavaScript

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open browser to `http://localhost:3000`

## API Endpoints

- GET `/productos` - Get all products
- POST `/subir-producto` - Publish new item
- POST `/pujar` - Place a bid
- GET `/historial/:id` - Get bid history
- POST `/borrar-historial` - Clear bid history
- DELETE `/producto/:id` - Delete product

## Folder Structure

```
├── server.js
├── database.sqlite
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
└── img/
```
