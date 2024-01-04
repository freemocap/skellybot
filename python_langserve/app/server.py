from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from langserve import add_routes
from rag_mongo import chain as rag_mongo_chain

app = FastAPI()


@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")



add_routes(app, rag_mongo_chain, path="/rag-mongo")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
