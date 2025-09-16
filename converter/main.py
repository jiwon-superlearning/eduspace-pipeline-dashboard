from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import io
import zipfile
import httpx
import fitz  # PyMuPDF

app = FastAPI(title="Converter Service", version="0.1.0")


class ConvertRequest(BaseModel):
    input_urls: List[str]
    output_format: str = "png"
    zip: bool = True


# Naive in-memory task store (for dev)
TASKS: dict[str, dict] = {}


@app.post("/convert/pdf-to-images")
async def convert_pdf_to_images(req: ConvertRequest):
    # Start async task and return task id
    task_id = str(id(req))
    TASKS[task_id] = {
        "status": "running",
        "total_pages": 0,
        "completed_pages": 0,
        "result": None,
        "cancel": False,
    }

    async def worker():
        try:
            # Count pages first
            total_pages = 0
            async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
                # Download and process sequentially (dev)
                buf_list: list[tuple[str, bytes]] = []
                for url in req.input_urls:
                    if TASKS[task_id]["cancel"]:
                        TASKS[task_id]["status"] = "cancelled"
                        return
                    r = await client.get(url)
                    r.raise_for_status()
                    buf_list.append((url, r.content))

                for _, data in buf_list:
                    doc = fitz.open(stream=data, filetype="pdf")
                    total_pages += doc.page_count
            TASKS[task_id]["total_pages"] = total_pages

            # Render
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                idx = 0
                for url, data in buf_list:
                    if TASKS[task_id]["cancel"]:
                        TASKS[task_id]["status"] = "cancelled"
                        return
                    doc = fitz.open(stream=data, filetype="pdf")
                    base = url.split("/")[-1].rsplit(".", 1)[0]
                    for p in range(doc.page_count):
                        if TASKS[task_id]["cancel"]:
                            TASKS[task_id]["status"] = "cancelled"
                            return
                        page = doc.load_page(p)
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                        img_bytes = pix.tobytes(output="png")
                        zf.writestr(f"{base}/page-{p+1:03d}.png", img_bytes)
                        idx += 1
                        TASKS[task_id]["completed_pages"] = idx

            TASKS[task_id]["status"] = "completed"
            TASKS[task_id]["result"] = zip_buf.getvalue()
        except Exception as e:
            TASKS[task_id]["status"] = "failed"
            TASKS[task_id]["error"] = str(e)

    asyncio.create_task(worker())
    return {"task_id": task_id}


@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    t = TASKS.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    resp = {
        "status": t["status"],
        "total_pages": t.get("total_pages", 0),
        "completed_pages": t.get("completed_pages", 0),
    }
    if t["status"] == "completed":
        resp["download_url"] = f"/tasks/{task_id}/download"
    if t["status"] == "failed":
        resp["error"] = t.get("error", "unknown")
    return JSONResponse(resp)


@app.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    t = TASKS.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="not found")
    t["cancel"] = True
    return {"ok": True}


@app.get("/tasks/{task_id}/download")
async def download_zip(task_id: str):
    t = TASKS.get(task_id)
    if not t or t.get("status") != "completed" or t.get("result") is None:
        raise HTTPException(status_code=404, detail="not ready")
    buf = io.BytesIO(t["result"])  # type: ignore
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={
        "Content-Disposition": f"attachment; filename=images-{task_id}.zip"
    })


