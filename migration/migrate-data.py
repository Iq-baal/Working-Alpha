#!/usr/bin/env python3
"""Migrate Convex export data to Appwrite collections."""
import json
import urllib.request
import urllib.error

API_KEY = "standard_3d788807f0271e95403a5fddd7c516cfb52bdacde92bdfb7c0613feed10cc79813574307e47e771e89eaa4346ab5ded43bfd06ba8e4fc7649db9d5330c83702eca938877433e23763eed1df49997807a935121651dc73d3172857f6309e368c88a28d66ec8252000524f78444763578f4abbe0a8ecda17b256033244261dbc31"
PROJECT = "69b1b3160029daf7b418"
DB = "main"
BASE = f"http://localhost/v1/databases/{DB}/collections"

def create_doc(collection, doc_id, data):
    url = f"{BASE}/{collection}/documents"
    body = json.dumps({"documentId": doc_id, "data": data}).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("X-Appwrite-Project", PROJECT)
    req.add_header("X-Appwrite-Key", API_KEY)
    try:
        resp = urllib.request.urlopen(req)
        print(f"  OK: {collection}/{doc_id}")
        return True
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        if "already exists" in err.lower() or "duplicate" in err.lower():
            print(f"  SKIP (exists): {collection}/{doc_id}")
            return True
        print(f"  ERR: {collection}/{doc_id} -> {err[:200]}")
        return False

# ============ USERS ============
print("=== USERS ===")
users = [
    ("user1", {
        "userId": "b6eec276-3731-419a-966d-a208060943db",
        "email": "asherpride112@gmail.com",
        "username": "enginasher",
        "usernameClaimed": True,
        "name": "Mustapha Abdullahi",
        "occupation": "Software Engineer",
        "walletAddress": "G8wGmR6XvctUiaNJrcw4WJYjHJ4VLQZa1x1yxRCweEzJ",
        "balance": 100.0,
        "verificationLevel": 1,
        "lastSeen": 1772993187616,
        "isAdmin": True,
        "bonusClaimed": True,
        "isGated": False,
        "canRefer": True,
    }),
    ("user2", {
        "userId": "6628e9cb-afdc-4f88-a828-980391384c3c",
        "email": "trishaflores005@gmail.com",
        "username": "trisha",
        "usernameClaimed": True,
        "balance": 100.0,
        "verificationLevel": 0,
        "lastSeen": 1773019025011,
        "isAdmin": False,
        "bonusClaimed": True,
        "walletAddress": "Cmitu8qyFjn7Ms3r9Tr9H5uj33ELLBtb7DEwESu6zodX",
        "isGated": False,
        "canRefer": False,
    }),
    ("user3", {
        "userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17",
        "email": "abdullahimustapha912@gmail.com",
        "username": "0xbillionaire",
        "usernameClaimed": True,
        "name": "Mustapha Abdullahi",
        "occupation": "Entrepreneur",
        "walletAddress": "HcGZEBnJpQytYFMJwHUnEYXFXsQJFBxJtYT6S8dbWBcm",
        "balance": 100.0,
        "verificationLevel": 1,
        "lastSeen": 1772995810456,
        "isAdmin": False,
        "bonusClaimed": True,
        "isGated": False,
        "canRefer": False,
    }),
]
for doc_id, data in users:
    create_doc("users", doc_id, data)

# ============ TRANSACTIONS ============
print("\n=== TRANSACTIONS ===")
transactions = [
    ("tx1", {
        "senderId": "payme_treasury",
        "senderAddress": "2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu",
        "receiverId": "b6eec276-3731-419a-966d-a208060943db",
        "receiverAddress": "G8wGmR6XvctUiaNJrcw4WJYjHJ4VLQZa1x1yxRCweEzJ",
        "amount": 10000.0,
        "currency": "USDC",
        "timestamp": 1772993187616,
        "status": "success",
        "type": "bonus",
        "signature": "67mocDpeQmQURT5Mh4oZjBfHDiE76JaHPWhPPt78iCXYNQE9p2BmUZ5FGu2EBh42b9RivFVToiEqdyVKHU2i1zPH",
        "fee": 0,
        "memo": "Welcome Bonus",
        "category": "bonus",
    }),
    ("tx2", {
        "senderId": "payme_treasury",
        "senderAddress": "2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu",
        "receiverId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17",
        "receiverAddress": "HcGZEBnJpQytYFMJwHUnEYXFXsQJFBxJtYT6S8dbWBcm",
        "amount": 10000.0,
        "currency": "USDC",
        "timestamp": 1772995779583,
        "status": "success",
        "type": "bonus",
        "signature": "33rY8cgVVcGtVkX326ceNNTnz8E7dB67fekTSMMt9iyWBRgWtfaC7z4Fysp6f15WGf38BfLCBWSqwuMnqn1RTUVM",
        "fee": 0,
        "memo": "Welcome Bonus",
        "category": "bonus",
    }),
    ("tx3", {
        "senderId": "payme_treasury",
        "senderAddress": "2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu",
        "receiverId": "6628e9cb-afdc-4f88-a828-980391384c3c",
        "receiverAddress": "Cmitu8qyFjn7Ms3r9Tr9H5uj33ELLBtb7DEwESu6zodX",
        "amount": 10000.0,
        "currency": "USDC",
        "timestamp": 1773019041453,
        "status": "success",
        "type": "bonus",
        "signature": "3XMqTEJmVbw5Vr4V8etEins8FRo2vAz1ZBAYUGEBwD2CpdjhfYNxfuowSwif5DNfeY2rhw8GYxLKgv77swKxodMA",
        "fee": 0,
        "memo": "Welcome Bonus",
        "category": "bonus",
    }),
    ("tx4", {
        "senderId": "b6eec276-3731-419a-966d-a208060943db",
        "senderAddress": "G8wGmR6XvctUiaNJrcw4WJYjHJ4VLQZa1x1yxRCweEzJ",
        "receiverId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17",
        "receiverAddress": "HcGZEBnJpQytYFMJwHUnEYXFXsQJFBxJtYT6S8dbWBcm",
        "amount": 43.58461538461538,
        "currency": "KES",
        "timestamp": 1773028704981,
        "status": "success",
        "type": "send",
        "signature": "52BAtZmQJmSaTtWoe9FURnQigjocEBCShsVmefc356dCGQKepGRkq7jdKhLj5mHaAmSuDzvTwLtStt8UpsHnMi6v",
        "fee": 0.003679,
        "memo": "0xbillionaire",
        "category": "transfer",
    }),
    ("tx5", {
        "senderId": "b6eec276-3731-419a-966d-a208060943db",
        "senderAddress": "G8wGmR6XvctUiaNJrcw4WJYjHJ4VLQZa1x1yxRCweEzJ",
        "receiverId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17",
        "receiverAddress": "HcGZEBnJpQytYFMJwHUnEYXFXsQJFBxJtYT6S8dbWBcm",
        "amount": 13.80248447204969,
        "currency": "NGN",
        "timestamp": 1773026928830,
        "status": "success",
        "type": "send",
        "signature": "3ZbEkScqnuXtyZ8PYM5Qz39sLW9xbjB5p7ybRv1crd4rxp3HkLgZmbMcJWHYZicBaS4bPKBR5CyK8jUrWtZsBasX",
        "fee": 0.00219,
        "memo": "0xbillionaire",
        "category": "transfer",
    }),
]
for doc_id, data in transactions:
    create_doc("transactions", doc_id, data)

# ============ NOTIFICATIONS ============
print("\n=== NOTIFICATIONS ===")
notifications = [
    ("notif01", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "payment_received", "title": "Payment Received", "content": "You received 13.802 NGN.", "read": False, "timestamp": 1773026928830, "data": '{"transactionId":"tx5","type":"send"}'}),
    ("notif02", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "system", "title": "Welcome to PayMe", "content": "Your wallet is ready. You can now send and receive funds.", "read": False, "timestamp": 1772990951732, "data": '{"event":"welcome"}'}),
    ("notif03", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "payment_received", "title": "Welcome Bonus Credited", "content": "You received 10,000 USDC welcome bonus.", "read": True, "timestamp": 1772993187616, "data": '{"transactionId":"tx1","type":"bonus"}'}),
    ("notif04", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "system", "title": "Profile Updated", "content": "Your profile photo was updated successfully.", "read": True, "timestamp": 1772995613226, "data": '{"event":"profile_update","fields":["profile photo"]}'}),
    ("notif05", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "payment_received", "title": "Welcome Bonus Credited", "content": "You received 10,000 USDC welcome bonus.", "read": False, "timestamp": 1772995779583, "data": '{"transactionId":"tx2","type":"bonus"}'}),
    ("notif06", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "system", "title": "Payment Sent", "content": "You sent 43.585 KES.", "read": True, "timestamp": 1773028704981, "data": '{"transactionId":"tx4","type":"send"}'}),
    ("notif07", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "system", "title": "Profile Updated", "content": "Your name, occupation were updated successfully.", "read": False, "timestamp": 1772995810456, "data": '{"event":"profile_update","fields":["name","occupation"]}'}),
    ("notif08", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "system", "title": "Payment Sent", "content": "You sent 13.802 NGN.", "read": True, "timestamp": 1773026928830, "data": '{"transactionId":"tx5","type":"send"}'}),
    ("notif09", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "system", "title": "Profile Updated", "content": "Your name, occupation were updated successfully.", "read": True, "timestamp": 1772995602244, "data": '{"event":"profile_update","fields":["name","occupation"]}'}),
    ("notif10", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "system", "title": "Profile Updated", "content": "Your profile photo was updated successfully.", "read": False, "timestamp": 1772995827255, "data": '{"event":"profile_update","fields":["profile photo"]}'}),
    ("notif11", {"userId": "6628e9cb-afdc-4f88-a828-980391384c3c", "type": "payment_received", "title": "Welcome Bonus Credited", "content": "You received 10,000 USDC welcome bonus.", "read": True, "timestamp": 1773019041453, "data": '{"transactionId":"tx3","type":"bonus"}'}),
    ("notif12", {"userId": "b6eec276-3731-419a-966d-a208060943db", "type": "system", "title": "Welcome to PayMe", "content": "Your wallet is ready. You can now send and receive funds.", "read": True, "timestamp": 1772991729937, "data": '{"event":"welcome"}'}),
    ("notif13", {"userId": "c46550eb-3a21-4ca3-a06a-bb6ba4608d17", "type": "payment_received", "title": "Payment Received", "content": "You received 43.585 KES.", "read": False, "timestamp": 1773028704981, "data": '{"transactionId":"tx4","type":"send"}'}),
    ("notif14", {"userId": "6628e9cb-afdc-4f88-a828-980391384c3c", "type": "system", "title": "Welcome to PayMe", "content": "Your wallet is ready. You can now send and receive funds.", "read": True, "timestamp": 1773019013974, "data": '{"event":"welcome"}'}),
]
for doc_id, data in notifications:
    create_doc("notifications", doc_id, data)

print("\n=== MIGRATION COMPLETE ===")
