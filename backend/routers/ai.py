"""
AI Router - Enhanced with Function Calling, Memory, and Multi-Agent concepts
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal, Any, Dict
import httpx
import json
from datetime import datetime

router = APIRouter(prefix="/ai", tags=["AI"])

# In-memory conversation storage (would use DB in production)
conversation_memory: Dict[str, List[dict]] = {}


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    provider: Literal["openai", "gemini", "deepseek"] = "openai"
    api_key: str
    model: Optional[str] = None
    trading_context: Optional[dict] = None
    session_id: Optional[str] = "default"
    use_memory: bool = True


class AnalyzeRequest(BaseModel):
    provider: Literal["openai", "gemini", "deepseek"] = "openai"
    api_key: str
    stats: dict
    question: Optional[str] = None
    analysis_type: Optional[str] = "comprehensive"


class QuickInsightRequest(BaseModel):
    provider: Literal["openai", "gemini", "deepseek"] = "openai"
    api_key: str
    stats: dict
    trades: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    response: str
    provider: str
    tools_used: Optional[List[str]] = None
    insights: Optional[List[str]] = None


# Define available tools for function calling
AVAILABLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "analyze_win_rate",
            "description": "วิเคราะห์ Win Rate และให้ข้อเสนอแนะ",
            "parameters": {
                "type": "object",
                "properties": {
                    "win_rate": {"type": "number", "description": "Win rate percentage"},
                    "total_trades": {"type": "integer", "description": "จำนวน trades ทั้งหมด"}
                },
                "required": ["win_rate"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_optimal_position",
            "description": "คำนวณ position size ที่เหมาะสมตาม Kelly Criterion",
            "parameters": {
                "type": "object",
                "properties": {
                    "win_rate": {"type": "number"},
                    "avg_win": {"type": "number"},
                    "avg_loss": {"type": "number"},
                    "account_balance": {"type": "number"}
                },
                "required": ["win_rate", "avg_win", "avg_loss"]
            }
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "identify_trading_patterns",
            "description": "ระบุ patterns และพฤติกรรมการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern_type": {"type": "string", "enum": ["time", "symbol", "size", "all"], "description": "ประเภท pattern ที่ต้องการวิเคราะห์"}
                },
                "required": ["pattern_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "risk_assessment",
            "description": "ประเมินความเสี่ยงของการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_drawdown": {"type": "number"},
                    "profit_factor": {"type": "number"},
                    "consecutive_losses": {"type": "integer"}
                },
                "required": ["max_drawdown", "profit_factor"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_action_items",
            "description": "สร้างรายการสิ่งที่ควรทำเพื่อปรับปรุงการเทรด",
            "parameters": {
                "type": "object",
                "properties": {
                    "priority": {"type": "string", "enum": ["high", "medium", "all"]}
                },
                "required": []
            }
        }
    },
    # ============ MongoDB Tools for Agentic AI ============
    {
        "type": "function",
        "function": {
            "name": "get_stock_analysis",
            "description": "ดึงรายงานวิเคราะห์หุ้นล่าสุดจาก database สำหรับ ticker ที่ระบุ เช่น NVDA, MSFT, AAPL",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker symbol เช่น NVDA, MSFT, AAPL"}
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_all_analyses",
            "description": "ดึงรายการหุ้นทั้งหมดที่มีการวิเคราะห์ใน database พร้อม decision (BUY/SELL/HOLD)",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "จำนวนรายการที่ต้องการ (default: 10)"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_decision_summary",
            "description": "สรุปจำนวน BUY/SELL/HOLD decisions ทั้งหมดใน database",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_chat_history",
            "description": "ดึงประวัติการสนทนาเกี่ยวกับ ticker ที่ระบุ",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Stock ticker symbol"}
                },
                "required": ["ticker"]
            }
        }
    }
]


def execute_tool(tool_name: str, arguments: dict, context: dict) -> str:
    """Execute a tool and return the result"""
    
    if tool_name == "analyze_win_rate":
        win_rate = arguments.get("win_rate", context.get("win_rate", 0))
        total_trades = arguments.get("total_trades", context.get("total_trades", 0))
        
        if win_rate >= 60:
            assessment = "ยอดเยี่ยม"
            advice = "รักษาระดับนี้ไว้ และพิจารณาเพิ่ม position size ได้"
        elif win_rate >= 50:
            assessment = "ดี"
            advice = "พยายามหาจุดเข้าเทรดที่มี probability สูงขึ้น"
        elif win_rate >= 40:
            assessment = "ปานกลาง"
            advice = "ต้องมี R:R ratio สูงเพื่อชดเชย win rate ที่ต่ำ"
        else:
            assessment = "ต้องปรับปรุง"
            advice = "ทบทวน strategy และ entry criteria"
            
        return f"📊 Win Rate Analysis:\n- ระดับ: {assessment} ({win_rate:.1f}%)\n- Trades: {total_trades}\n- คำแนะนำ: {advice}"
    
    elif tool_name == "calculate_optimal_position":
        win_rate = arguments.get("win_rate", 50) / 100
        avg_win = arguments.get("avg_win", 1)
        avg_loss = abs(arguments.get("avg_loss", 1))
        balance = arguments.get("account_balance", 10000)
        
        if avg_loss > 0:
            rr_ratio = avg_win / avg_loss
            kelly = ((win_rate * rr_ratio) - (1 - win_rate)) / rr_ratio
            kelly_half = kelly / 2
            conservative = kelly / 4
            
            return f"""🎯 Position Sizing:
- Kelly Full: {kelly*100:.1f}%
- Kelly Half (แนะนำ): {kelly_half*100:.1f}%  
- Conservative: {conservative*100:.1f}%
- ถ้า Balance ${balance:,.0f} → ใช้ ${balance * kelly_half:.0f} ต่อ trade"""
        return "ไม่สามารถคำนวณได้ - ข้อมูลไม่ครบ"
    
    elif tool_name == "risk_assessment":
        max_dd = arguments.get("max_drawdown", context.get("max_drawdown", 0))
        pf = arguments.get("profit_factor", context.get("profit_factor", 0))
        
        risk_level = "🟢 ต่ำ"
        if max_dd > 20 or pf < 1.2:
            risk_level = "🔴 สูง"
        elif max_dd > 10 or pf < 1.5:
            risk_level = "🟡 ปานกลาง"
            
        return f"""⚠️ Risk Assessment:
- ระดับความเสี่ยง: {risk_level}
- Max Drawdown: {max_dd:.1f}%
- Profit Factor: {pf:.2f}
- คำแนะนำ: {"ลด position size" if risk_level == "🔴 สูง" else "รักษาวินัยการเทรด"}"""
    
    elif tool_name == "generate_action_items":
        priority = arguments.get("priority", "all")
        items = []
        
        # Generate based on context
        if context.get("win_rate", 0) < 50:
            items.append("🔴 ปรับปรุง entry criteria - Win Rate ต่ำกว่า 50%")
        if context.get("max_drawdown", 0) > 15:
            items.append("🔴 ลด position size - Drawdown สูงเกินไป")
        if context.get("profit_factor", 0) < 1.3:
            items.append("🟡 เพิ่ม profit factor ด้วยการ cut loss เร็วขึ้น")
        if context.get("avg_loss", 0) != 0 and abs(context.get("avg_win", 0) / abs(context.get("avg_loss", 1))) < 1.5:
            items.append("🟡 เพิ่ม R:R ratio - ตั้ง TP ไกลขึ้น หรือ SL แคบลง")
            
        if not items:
            items.append("✅ ผลการเทรดอยู่ในเกณฑ์ดี - รักษามาตรฐานนี้ไว้")
            
        return "📋 Action Items:\n" + "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
    
    elif tool_name == "identify_trading_patterns":
        pattern_type = arguments.get("pattern_type", "all")
        patterns = []
        
        # Would analyze actual trades in production
        patterns.append("- เทรดบ่อยที่สุดในช่วง 15:00-18:00 (London-NY overlap)")
        patterns.append("- Symbol ที่ทำกำไรมากสุด: XAUUSD")
        patterns.append("- Trades ที่ถือนานกว่า 4 ชม. มี win rate สูงกว่า")
        
        return "🔍 Trading Patterns:\n" + "\n".join(patterns)
    
    # MongoDB tools will be handled by execute_tool_async
    elif tool_name in ["get_stock_analysis", "get_all_analyses", "get_decision_summary", "get_chat_history"]:
        return f"[ASYNC_TOOL:{tool_name}]"  # Marker for async handling
    
    return f"Tool {tool_name} executed"


# MongoDB connection for AI tools
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URI = "mongodb+srv://new_user_44444:new_user_44444@cluster0.amwffev.mongodb.net/?appName=Cluster0"
mongo_client: AsyncIOMotorClient = None

async def get_mongo_client():
    global mongo_client
    if mongo_client is None:
        mongo_client = AsyncIOMotorClient(MONGO_URI)
    return mongo_client


async def execute_tool_async(tool_name: str, arguments: dict, context: dict) -> str:
    """Execute async tools (MongoDB queries)"""
    client = await get_mongo_client()
    db = client["trading-bot"]
    
    if tool_name == "get_stock_analysis":
        ticker = arguments.get("ticker", "").upper()
        doc = await db["analyses"].find_one(
            {"ticker": ticker},
            sort=[("analysis_date", -1)]
        )
        if not doc:
            return f"❌ ไม่พบข้อมูลวิเคราะห์สำหรับ {ticker}"
        
        return f"""📊 **รายงานวิเคราะห์ {ticker}**
📅 วันที่: {doc.get('analysis_date', 'N/A')}
🎯 Decision: **{doc.get('final_decision', 'N/A')}**

{doc.get('report_content', '')[:1500]}"""
    
    elif tool_name == "get_all_analyses":
        limit = arguments.get("limit", 10)
        cursor = db["analyses"].find().sort("analysis_date", -1).limit(limit)
        results = []
        async for doc in cursor:
            results.append(f"- **{doc.get('ticker')}**: {doc.get('final_decision')} ({str(doc.get('analysis_date', ''))[:10]})")
        
        if not results:
            return "❌ ไม่พบข้อมูลวิเคราะห์ใน database"
        
        return f"📈 **รายการหุ้นที่วิเคราะห์ล่าสุด ({len(results)} รายการ)**\n" + "\n".join(results)
    
    elif tool_name == "get_decision_summary":
        pipeline = [
            {"$group": {"_id": "$final_decision", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        results = []
        async for doc in db["analyses"].aggregate(pipeline):
            decision = doc["_id"] or "Unknown"
            count = doc["count"]
            emoji = "🟢" if "BUY" in str(decision).upper() else "🔴" if "SELL" in str(decision).upper() else "🟡"
            results.append(f"{emoji} {decision}: {count} หุ้น")
        
        if not results:
            return "❌ ไม่พบข้อมูล decisions"
        
        return "📊 **สรุป Decisions ใน Database**\n" + "\n".join(results)
    
    elif tool_name == "get_chat_history":
        ticker = arguments.get("ticker", "").upper()
        cursor = db["chat_messages"].find({"ticker": ticker}).sort("timestamp", -1).limit(10)
        messages = []
        async for doc in cursor:
            role = doc.get("role", "")
            content = doc.get("content", "")[:200]
            messages.append(f"[{role}] {content}...")
        
        if not messages:
            return f"❌ ไม่พบประวัติสนทนาสำหรับ {ticker}"
        
        return f"💬 **ประวัติสนทนาเกี่ยวกับ {ticker}**\n" + "\n".join(messages[:5])
    
    return f"Unknown async tool: {tool_name}"


# ============ Chat Storage for RAG ============

async def save_chat_to_db(session_id: str, user_message: str, assistant_response: str, 
                           trading_context: dict = None):
    """Save chat to MongoDB for future RAG retrieval"""
    try:
        client = await get_mongo_client()
        db = client["trading-bot"]
        
        # Create chat document
        chat_doc = {
            "session_id": session_id,
            "timestamp": datetime.now(),
            "user_message": user_message,
            "assistant_response": assistant_response,
            "trading_context_summary": {
                "total_trades": trading_context.get('currentData', {}).get('performance', {}).get('totalTrades', 0) if trading_context else 0,
                "win_rate": trading_context.get('currentData', {}).get('performance', {}).get('winRate', 0) if trading_context else 0,
            } if trading_context else None,
            "keywords": extract_keywords(user_message + " " + assistant_response)
        }
        
        await db["chat_history"].insert_one(chat_doc)
        
    except Exception as e:
        print(f"Error saving chat: {e}")


def extract_keywords(text: str) -> List[str]:
    """Extract simple keywords from text for search"""
    # Simple keyword extraction - trading terms
    trading_terms = [
        "win rate", "profit", "loss", "drawdown", "trades", "balance",
        "equity", "margin", "leverage", "symbol", "position", "risk",
        "strategy", "entry", "exit", "stop loss", "take profit",
        "xauusd", "eurusd", "gbpusd", "usdjpy", "gold", "forex"
    ]
    
    text_lower = text.lower()
    found = [term for term in trading_terms if term in text_lower]
    return found


async def get_relevant_history(session_id: str, query: str, limit: int = 5) -> List[dict]:
    """Get relevant past conversations for RAG"""
    try:
        client = await get_mongo_client()
        db = client["trading-bot"]
        
        # Get recent chats from this session
        cursor = db["chat_history"].find(
            {"session_id": session_id}
        ).sort("timestamp", -1).limit(limit)
        
        history = []
        async for doc in cursor:
            history.append({
                "user": doc.get("user_message", ""),
                "assistant": doc.get("assistant_response", "")[:500],
                "time": str(doc.get("timestamp", ""))
            })
        
        return history
        
    except Exception as e:
        print(f"Error getting history: {e}")
        return []


async def search_chat_history(query: str, limit: int = 3) -> List[dict]:
    """Search across all chat history for relevant context (RAG)"""
    try:
        client = await get_mongo_client()
        db = client["trading-bot"]
        
        # Extract query keywords
        keywords = extract_keywords(query)
        
        if not keywords:
            # Just get recent history
            cursor = db["chat_history"].find().sort("timestamp", -1).limit(limit)
        else:
            # Search by keywords
            cursor = db["chat_history"].find({
                "keywords": {"$in": keywords}
            }).sort("timestamp", -1).limit(limit)
        
        results = []
        async for doc in cursor:
            results.append({
                "user": doc.get("user_message", ""),
                "assistant": doc.get("assistant_response", "")[:300],
                "keywords": doc.get("keywords", [])
            })
        
        return results
        
    except Exception as e:
        print(f"Error searching: {e}")
        return []


async def chat_openai_with_tools(messages: List[dict], api_key: str, model: str = "gpt-4o", 
                                  context: dict = None) -> tuple[str, List[str]]:
    """Call OpenAI Chat API with function calling"""
    tools_used = []
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # First call with tools
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "tools": AVAILABLE_TOOLS,
                "tool_choice": "auto",
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
        
        data = response.json()
        assistant_message = data["choices"][0]["message"]
        
        # Check if model wants to use tools
        if assistant_message.get("tool_calls"):
            # Execute tools and add results
            tool_messages = [assistant_message]
            
            for tool_call in assistant_message["tool_calls"]:
                tool_name = tool_call["function"]["name"]
                try:
                    arguments = json.loads(tool_call["function"]["arguments"])
                except:
                    arguments = {}
                    
                tools_used.append(tool_name)
                
                # Check if it's an async MongoDB tool
                if tool_name in ["get_stock_analysis", "get_all_analyses", "get_decision_summary", "get_chat_history"]:
                    result = await execute_tool_async(tool_name, arguments, context or {})
                else:
                    result = execute_tool(tool_name, arguments, context or {})
                
                tool_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": result
                })
            
            # Second call with tool results
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages + tool_messages,
                    "temperature": 0.7,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                error = response.json().get("error", {}).get("message", "Unknown error")
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
            
            data = response.json()
        
        return data["choices"][0]["message"]["content"], tools_used


async def chat_openai(messages: List[dict], api_key: str, model: str = "gpt-4o-mini") -> str:
    """Call OpenAI Chat API (simple version)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"OpenAI Error: {error}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def chat_deepseek(messages: List[dict], api_key: str, model: str = "deepseek-chat") -> str:
    """Call DeepSeek API (OpenAI-compatible format)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.deepseek.com/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"DeepSeek Error: {error}")
        
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def chat_gemini(messages: List[dict], api_key: str, model: str = "gemini-2.0-flash") -> str:
    """Call Google Gemini API"""
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        else:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
    
    request_body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2000
        }
    }
    
    if system_instruction:
        request_body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
            headers={"Content-Type": "application/json"},
            json=request_body
        )
        
        if response.status_code != 200:
            error = response.json().get("error", {}).get("message", "Unknown error")
            raise HTTPException(status_code=response.status_code, detail=f"Gemini Error: {error}")
        
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


def build_enhanced_system_prompt(trading_context: Optional[dict] = None) -> str:
    """Build enhanced system prompt with detailed trading context"""
    base_prompt = """คุณเป็น **Trading Performance Analyst** ของ TradeTracker Dashboard
คุณมีหน้าที่วิเคราะห์ผลการเทรดจากข้อมูลที่ระบบส่งมาให้

## 🎯 สิ่งสำคัญ:
- **คุณสามารถเห็นข้อมูลการเทรดของผู้ใช้ได้** (ดูด้านล่าง)
- ตอบจากข้อมูลจริงเท่านั้น อย่าเดา
- ใช้ภาษาไทย กระชับ ตรงประเด็น
- ถ้าถูกถามเกี่ยวกับข้อมูลที่ไม่มี ให้บอกตรงๆ ว่าไม่มีข้อมูล"""
    
    if trading_context:
        # Handle nested structure from frontend
        current_data = trading_context.get('currentData', trading_context)
        account = current_data.get('account', {})
        performance = current_data.get('performance', current_data)
        trades = current_data.get('recentTrades', [])
        symbols = current_data.get('symbolBreakdown', {})
        
        # Account info
        account_str = ""
        if account:
            account_str = f"""
## 💼 บัญชีของผู้ใช้:
- Login: {account.get('login', 'N/A')}
- Balance: ${account.get('balance', 0):,.2f}
- Equity: ${account.get('equity', 0):,.2f}
- Free Margin: ${account.get('freeMargin', 0):,.2f}
- Leverage: 1:{account.get('leverage', 0)}
- Server: {account.get('server', 'N/A')}"""
        
        # Performance stats
        perf_str = ""
        if performance:
            total_trades = performance.get('totalTrades', performance.get('total_trades', 0))
            win_rate = performance.get('winRate', performance.get('win_rate', 0))
            profit_factor = performance.get('profitFactor', performance.get('profit_factor', 0))
            total_profit = performance.get('totalProfit', performance.get('total_profit', 0))
            max_dd = performance.get('maxDrawdown', performance.get('max_drawdown', 0))
            
            perf_str = f"""
## 📊 สถิติการเทรด:
| Metric | Value |
|--------|-------|
| Total Trades | {total_trades} |
| Winning | {performance.get('winningTrades', performance.get('winning_trades', 0))} |
| Losing | {performance.get('losingTrades', performance.get('losing_trades', 0))} |
| Win Rate | {win_rate:.1f}% |
| Profit Factor | {profit_factor:.2f} |
| Total Profit | ${total_profit:,.2f} |
| Max Drawdown | {max_dd:.1f}% |
| Avg Win | ${performance.get('avgWin', performance.get('avg_win', 0)):,.2f} |
| Avg Loss | ${performance.get('avgLoss', performance.get('avg_loss', 0)):,.2f} |
| Largest Win | ${performance.get('largestWin', performance.get('largest_win', 0)):,.2f} |
| Largest Loss | ${performance.get('largestLoss', performance.get('largest_loss', 0)):,.2f} |
| Sharpe Ratio | {performance.get('sharpeRatio', performance.get('sharpe_ratio', 0)):.2f} |
| Total Gain | {performance.get('totalGain', performance.get('absolute_gain', 0)):.2f}% |"""
        
        # Recent trades
        trades_str = ""
        if trades and len(trades) > 0:
            trades_list = "\n".join([
                f"- {t.get('symbol')} | {t.get('type')} | {t.get('volume')} lots | ${t.get('profit', 0):,.2f} | {t.get('time', '')[:16]}"
                for t in trades[:10]
            ])
            trades_str = f"""
## 📈 Trades ล่าสุด (10 รายการ):
{trades_list}"""
        
        # Symbol breakdown
        symbol_str = ""
        if symbols:
            symbol_list = "\n".join([
                f"- {sym}: {data.get('count', 0)} trades, ${data.get('profit', 0):,.2f}, {data.get('wins', 0)} wins"
                for sym, data in list(symbols.items())[:5]
            ])
            symbol_str = f"""
## 🎯 Symbol Breakdown:
{symbol_list}"""
        
        base_prompt += account_str + perf_str + trades_str + symbol_str
        
        base_prompt += """

## 📌 คำแนะนำตอบ:
- ถ้าผู้ใช้ถาม "เห็นอะไรบ้าง" → บอกข้อมูลที่เห็นด้านบน
- ถ้าผู้ใช้ถาม "วันนี้เทรดเป็นไง" → ดูจาก trades ล่าสุด
- ถ้าผู้ใช้ถามเรื่อง win rate, profit → ตอบจากตาราง
- ตอบกระชับ ไม่ต้องยาว"""
    else:
        base_prompt += """

## ⚠️ ไม่มีข้อมูลการเทรด
ผู้ใช้ยังไม่ได้เชื่อมต่อ MT5 หรือยังไม่มี trades
แนะนำให้กด Connect ที่หน้าเว็บก่อน"""
    
    return base_prompt


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Enhanced chat with AI about trading - supports function calling and memory"""
    try:
        session_id = request.session_id or "default"
        
        # Load conversation memory
        if request.use_memory and session_id in conversation_memory:
            history = conversation_memory[session_id][-10:]  # Last 10 messages
        else:
            history = []
        
        # Build messages with enhanced system context
        messages = []
        system_prompt = build_enhanced_system_prompt(request.trading_context)
        messages.append({"role": "system", "content": system_prompt})
        
        # Add history
        messages.extend(history)
        
        # Add new messages
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})
        
        tools_used = []
        
        # Call the selected provider
        if request.provider == "openai":
            model = request.model or "gpt-4o"
            # Use function calling for GPT-4o
            if "gpt-4" in model:
                response, tools_used = await chat_openai_with_tools(
                    messages, request.api_key, model, request.trading_context
                )
            else:
                response = await chat_openai(messages, request.api_key, model)
        elif request.provider == "deepseek":
            model = request.model or "deepseek-chat"
            response = await chat_deepseek(messages, request.api_key, model)
        else:
            model = request.model or "gemini-2.0-flash"
            response = await chat_gemini(messages, request.api_key, model)
        
        # Save to memory
        if request.use_memory:
            if session_id not in conversation_memory:
                conversation_memory[session_id] = []
            conversation_memory[session_id].append({"role": "user", "content": request.messages[-1].content})
            conversation_memory[session_id].append({"role": "assistant", "content": response})
            # Keep last 20 messages
            conversation_memory[session_id] = conversation_memory[session_id][-20:]
        
        # Save to MongoDB for RAG
        await save_chat_to_db(
            session_id=session_id,
            user_message=request.messages[-1].content,
            assistant_response=response,
            trading_context=request.trading_context
        )
        
        return ChatResponse(
            response=response, 
            provider=request.provider,
            tools_used=tools_used if tools_used else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-insights", response_model=ChatResponse)
async def quick_insights(request: QuickInsightRequest):
    """Generate automatic quick insights from trading stats"""
    try:
        stats = request.stats
        insights = []
        
        # Win Rate insight
        win_rate = stats.get('win_rate', 0)
        if win_rate >= 60:
            insights.append(f"🌟 Win Rate ยอดเยี่ยม ({win_rate:.1f}%) - รักษาระดับนี้ไว้")
        elif win_rate < 40:
            insights.append(f"⚠️ Win Rate ต่ำ ({win_rate:.1f}%) - ทบทวน entry criteria")
        
        # Profit Factor insight
        pf = stats.get('profit_factor', 0)
        if pf >= 2:
            insights.append(f"✅ Profit Factor ดีมาก ({pf:.2f}) - ระบบมี edge ชัดเจน")
        elif pf < 1:
            insights.append(f"❌ Profit Factor < 1 ({pf:.2f}) - ระบบขาดทุนในระยะยาว")
        
        # Drawdown insight
        dd = stats.get('max_drawdown', 0)
        if dd > 20:
            insights.append(f"🔴 Drawdown สูง ({dd:.1f}%) - ลด position size ทันที")
        elif dd > 10:
            insights.append(f"🟡 Drawdown ปานกลาง ({dd:.1f}%) - ระวังการเพิ่ม exposure")
        
        # R:R insight
        avg_win = stats.get('avg_win', 0)
        avg_loss = abs(stats.get('avg_loss', 1))
        if avg_loss > 0:
            rr = avg_win / avg_loss
            if rr < 1:
                insights.append(f"⚠️ R:R Ratio ต่ำ (1:{rr:.1f}) - เพิ่ม TP หรือลด SL")
        
        # Combine insights
        if not insights:
            insights.append("✅ ผลการเทรดอยู่ในเกณฑ์ดี ไม่มีประเด็นที่น่ากังวล")
        
        prompt = f"""จากสถิติการเทรด สรุป 3 ประเด็นสำคัญที่สุดให้กระชับ:

Insights ที่วิเคราะห์ได้:
{chr(10).join(insights)}

ให้สรุปเป็นภาษาไทย กระชับ ได้ใจความ พร้อม action items"""

        system_prompt = build_enhanced_system_prompt(stats)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        if request.provider == "openai":
            response = await chat_openai(messages, request.api_key, "gpt-4o-mini")
        elif request.provider == "deepseek":
            response = await chat_deepseek(messages, request.api_key, "deepseek-chat")
        else:
            response = await chat_gemini(messages, request.api_key, "gemini-2.0-flash")
        
        return ChatResponse(
            response=response, 
            provider=request.provider,
            insights=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze", response_model=ChatResponse)
async def analyze(request: AnalyzeRequest):
    """Comprehensive AI analysis of trading stats"""
    try:
        analysis_prompts = {
            "comprehensive": """ทำการวิเคราะห์แบบครบถ้วน:

1. 📊 **สรุปภาพรวม** (1-2 ประโยค)
2. ✅ **จุดแข็ง 3 ข้อ** พร้อมตัวเลขสนับสนุน
3. ⚠️ **จุดที่ต้องปรับปรุง 3 ข้อ** พร้อมวิธีแก้ไข
4. 🎯 **Position Sizing แนะนำ** (ใช้ Kelly Criterion)
5. 📋 **Action Items สำหรับสัปดาห์หน้า** (3 ข้อ จัดลำดับความสำคัญ)""",

            "quick": """สรุปสั้นๆ 3 ประเด็นหลัก:
1. สถานะปัจจุบัน
2. สิ่งที่ควรทำ
3. สิ่งที่ควรหลีกเลี่ยง""",

            "risk": """วิเคราะห์ความเสี่ยง:
1. ระดับความเสี่ยงปัจจุบัน
2. ปัจจัยเสี่ยงหลัก
3. วิธีลดความเสี่ยง""",

            "strategy": """วิเคราะห์ strategy:
1. ลักษณะ strategy (trend following, scalping, etc.)
2. ความเหมาะสมกับตลาดปัจจุบัน
3. การปรับปรุงที่แนะนำ"""
        }
        
        question = request.question or analysis_prompts.get(request.analysis_type, analysis_prompts["comprehensive"])
        
        system_prompt = build_enhanced_system_prompt(request.stats)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
        
        if request.provider == "openai":
            response = await chat_openai(messages, request.api_key, "gpt-4o-mini")
        elif request.provider == "deepseek":
            response = await chat_deepseek(messages, request.api_key, "deepseek-chat")
        else:
            response = await chat_gemini(messages, request.api_key, "gemini-2.0-flash")
        
        return ChatResponse(response=response, provider=request.provider)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{session_id}")
async def clear_memory(session_id: str):
    """Clear conversation memory for a session"""
    if session_id in conversation_memory:
        del conversation_memory[session_id]
        return {"message": f"Memory cleared for session {session_id}"}
    return {"message": "No memory found for this session"}


@router.get("/memory/{session_id}")
async def get_memory(session_id: str):
    """Get conversation history for a session"""
    return {
        "session_id": session_id,
        "messages": conversation_memory.get(session_id, []),
        "count": len(conversation_memory.get(session_id, []))
    }


# ============ Chat History API (MongoDB) ============

@router.get("/history/{session_id}")
async def get_chat_history_from_db(session_id: str, limit: int = 20):
    """Get chat history from MongoDB for a session"""
    try:
        history = await get_relevant_history(session_id, "", limit)
        return {"session_id": session_id, "history": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/search")
async def search_history(query: str, limit: int = 5):
    """Search chat history for RAG (keyword-based)"""
    try:
        results = await search_chat_history(query, limit)
        keywords = extract_keywords(query)
        return {"query": query, "keywords": keywords, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history from MongoDB for a session"""
    try:
        client = await get_mongo_client()
        db = client["trading-bot"]
        result = await db["chat_history"].delete_many({"session_id": session_id})
        return {"message": f"Deleted {result.deleted_count} messages from session {session_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def get_all_sessions():
    """Get all chat sessions from MongoDB"""
    try:
        client = await get_mongo_client()
        db = client["trading-bot"]
        
        # Get distinct session IDs with their messages
        pipeline = [
            {"$sort": {"timestamp": -1}},
            {"$group": {
                "_id": "$session_id",
                "messages": {"$push": {
                    "user": "$user_message",
                    "assistant": "$assistant_response",
                    "timestamp": "$timestamp"
                }},
                "lastMessage": {"$first": "$timestamp"},
                "title": {"$first": "$user_message"}
            }},
            {"$sort": {"lastMessage": -1}},
            {"$limit": 20}
        ]
        
        sessions = []
        async for doc in db["chat_history"].aggregate(pipeline):
            sessions.append({
                "id": doc["_id"],
                "title": doc["title"][:30] + "..." if len(doc.get("title", "")) > 30 else doc.get("title", "New Chat"),
                "messages": doc["messages"][:20],  # Last 20 messages
                "lastMessage": str(doc["lastMessage"])
            })
        
        return {"sessions": sessions, "count": len(sessions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
