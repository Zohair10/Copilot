import requests
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url = os.getenv("GITHUB_BILLING_URL")
token = os.getenv("GITHUB_TOKEN")

headers = {
    "Authorization": f"Bearer {token}"
}
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    client = MongoClient("mongodb://localhost:27017/")
    db = client["GitHubCopilotData"]
    collection = db["GetMetricsData"]

    # Ensure a unique index on 'date' (or another unique field)
    collection.create_index("date", unique=True)

    # Upsert each record to avoid duplicates
    if isinstance(data, list):
        for record in data:
            collection.update_one(
                {"date": record["date"]},  # Match by date
                {"$set": record},          # Update or insert
                upsert=True
            )
    else:
        collection.update_one(
            {"date": data["date"]},
            {"$set": data},
            upsert=True
        )
    print("Data upserted into MongoDB.")
else:
    print("Failed to fetch data:", response.status_code)