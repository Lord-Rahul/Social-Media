# Social-Media

## Overview
A micro-social-media platform built with Node.js and Express

## Tech Stack
- **Backend**: Node.js, Express
- **Database**: MongoDB
- Utilities: dotenv, bcrypt, JWT...

## Setup & Installation
1. Clone the repo  
2. `cd backend`  
3. Install dependencies: `npm install`  
4. Set environment variables (e.g. `PORT`, `DB_URI`, `JWT_SECRET`)  
5. Start server: `npm run start`  
6. Visit `http://localhost:3000`

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Register new user |
| `/auth/login` | POST | Login user and return token |
| `/posts` | GET | Get all posts |
| ... | ... | ... |

## Project Structure
Social-Media/
├── backend/
├── controllers/
├── routes/
├── models/
└── index.js
├── .gitignore
└── README.md


## Contributing
- Fork the repo  
- Create feature branch  
- Submit PR...

