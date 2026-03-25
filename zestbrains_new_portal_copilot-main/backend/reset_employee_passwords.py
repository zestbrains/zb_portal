"""
Utility script to reset employee passwords to default (Zb@123456)
Run this if employees can't login after password changes.
Usage: python reset_employee_passwords.py [email or employee_id or 'all']
"""
import sys
import pymongo
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
client = pymongo.MongoClient("mongodb://localhost:27017")
db = client["test_database"]

DEFAULT_PASSWORD = "Zb@123456"

def reset_password(identifier=None):
    new_hash = pwd_context.hash(DEFAULT_PASSWORD)
    
    if identifier and identifier != 'all':
        # Reset specific user
        query = {"$or": [
            {"email": identifier},
            {"employee_id": identifier},
            {"username": identifier}
        ]}
        result = db.users.update_one(query, {"$set": {"password_hash": new_hash}})
        if result.modified_count > 0:
            user = db.users.find_one(query)
            print(f"✅ Reset password for: {user['email']} (employee_id: {user.get('employee_id', 'N/A')})")
        else:
            print(f"❌ User not found: {identifier}")
    else:
        # Reset all employee passwords
        result = db.users.update_many(
            {"role": "employee"},
            {"$set": {"password_hash": new_hash}}
        )
        print(f"✅ Reset passwords for {result.modified_count} employees to '{DEFAULT_PASSWORD}'")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        reset_password(sys.argv[1])
    else:
        print("Usage: python reset_employee_passwords.py [email|employee_id|all]")
        print("Example: python reset_employee_passwords.py john@company.com")
        print("Example: python reset_employee_passwords.py all")
