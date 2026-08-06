import pyotp
import qrcode
import os

secret = pyotp.random_base32()
print(f"Generated Secret: {secret}")

# Save to .env in project root
with open("../.env", "w") as f:
    f.write(f"TOTP_SECRET={secret}\n")

# Generate provisioning URI
uri = pyotp.totp.TOTP(secret).provisioning_uri(name="shivamdevs", issuer_name="Almari POC Lab")

# Generate QR code
img = qrcode.make(uri)
img.save("/Users/shivamdevs/.gemini/antigravity/brain/6edc3d97-2bbe-46bb-9e2b-d519780cf02d/totp_qr.png")
print("QR Code saved to artifacts.")
