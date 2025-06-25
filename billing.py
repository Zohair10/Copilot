import requests
from pymongo import MongoClient
from dotenv import load_dotenv
import os

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
    print("Total seats:", data.get("total_seats"))
    seats = data.get("seats", [])

    client = MongoClient("mongodb://localhost:27017/")
    db = client["GitHubCopilotData"]
    collection = db["BillingSeats"]

    new_count = 0
    update_count = 0
    for seat in seats:
        created_at = seat.get("created_at")
        assignee = seat.get("assignee", {})
        assignee_id = assignee.get("id")
        updated_at = seat.get("updated_at")
        plan_type = seat.get("plan_type")
        last_activity_at = seat.get("last_activity_at")
        last_activity_editor = seat.get("last_activity_editor")

        # Check for existing record with same created_at and assignee.id
        duplicate = collection.find_one({
            "created_at": created_at,
            "assignee.id": assignee_id
        })

        if not duplicate:
            # No record with same created_at and id, insert new
            collection.insert_one(seat)
            print(f"Inserted new seat with created_at: {created_at}, id: {assignee_id}")
            new_count += 1
        else:
            # Record exists, check if any relevant field has changed
            needs_update = (
                duplicate.get("updated_at") != updated_at or
                duplicate.get("plan_type") != plan_type or
                duplicate.get("last_activity_at") != last_activity_at or
                duplicate.get("last_activity_editor") != last_activity_editor
            )
            if needs_update:
                collection.update_one(
                    {"_id": duplicate["_id"]},
                    {"$set": {
                        "updated_at": updated_at,
                        "plan_type": plan_type,
                        "last_activity_at": last_activity_at,
                        "last_activity_editor": last_activity_editor
                    }}
                )
                print(f"Updated seat for id: {assignee_id} at created_at: {created_at}")
                update_count += 1
            else:
                print(f"No change for seat with created_at: {created_at}, id: {assignee_id}")

    print(f"Inserted {new_count} new records.")
    print(f"Updated {update_count} records.")
else:
    print(f"Error: {response.status_code} - {response.text}")
