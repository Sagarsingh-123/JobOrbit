# JobOrbit

JobOrbit is a full-stack job portal built with React + Vite on the frontend and Node.js + Express + MongoDB on the backend.

## Project structure

- `joborbit/` - React frontend
- `backend/` - Express API with MongoDB

## Local development

1. Start MongoDB locally.
2. Update backend environment values in `backend/.env`.
3. Run the API:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Run the frontend:
   ```bash
   cd joborbit
   npm install
   npm run dev
   ```

## Production deployment

### Frontend (Vercel)

1. Import the GitHub repo into Vercel.
2. Set the project root to `joborbit`.
3. Set this environment variable:
   ```bash
   VITE_API_URL=https://YOUR_RENDER_BACKEND_URL.onrender.com/api
   ```
4. Deploy.

### Backend (Render)

1. Create a new Web Service in Render.
2. Set the root directory to `backend`.
3. Use the following build/start commands:
   ```bash
   npm install
   npm start
   ```
4. Add environment variables:
   - `PORT=10000`
   - `MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/joborbit?retryWrites=true&w=majority`
   - `JWT_SECRET=<your-long-random-secret>`

## GitHub push

```bash
git remote add origin https://github.com/YOUR_USERNAME/JobOrbit.git
git branch -M main
git push -u origin main
```

## Demo notes

- Frontend uses `VITE_API_URL` to point to the deployed backend API.
- Backend uses MongoDB Atlas or any hosted MongoDB database.
