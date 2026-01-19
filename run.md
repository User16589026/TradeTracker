cd c:\Users\p\Desktop\Trade_Tracker\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

cd c:\Users\p\Desktop\Trade_Tracker\frontend
npm run dev

ngrok http 8000