import re

with open('contracts/scripts/deploy.ts', 'r') as f:
    content = f.read()

old_signer = "const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || deployer.address;"
new_signer = """  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS;
  if (!BACKEND_SIGNER) {
    console.error("CRITICAL ERROR: BACKEND_SIGNER_ADDRESS env variable must be provided!");
    console.error("The backend signer key and the contract owner key must be different for security.");
    process.exitCode = 1;
    return;
  }
  if (BACKEND_SIGNER.toLowerCase() === deployer.address.toLowerCase()) {
    console.error("CRITICAL ERROR: BACKEND_SIGNER_ADDRESS cannot be the same as the deployer (owner) address!");
    process.exitCode = 1;
    return;
  }"""

if old_signer in content:
    content = content.replace(old_signer, new_signer)
    with open('contracts/scripts/deploy.ts', 'w') as f:
        f.write(content)
    print("Success: deploy.ts updated")
else:
    print("Error: old_signer not found in deploy.ts")
