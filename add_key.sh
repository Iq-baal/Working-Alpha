#!/bin/bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAdtgV/9XwWC4UOBL6m6sRHuOPNKr8oe3uAEprYrlZr+ Mustapha Abdullahi"
echo "$KEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
echo "Done! Key added."
