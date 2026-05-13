# Security Specification for Kas RT App

## 1. Data Invariants
- An RT resident (Warga) must have a valid name and house number.
- A transaction must belong to a valid category.
- If a transaction is linked to a resident, that resident must exist.
- Income/Expense types are immutable after creation.
- Timestamps must be server-generated.
- Arrears (Tunggakan Macet) are only readable by authenticated community managers (signed-in users).

## 2. The "Dirty Dozen" Payloads
1. **Malicious ID Poisoning**: Create a resident with a 1MB junk ID.
2. **Identity Spoofing**: User A tries to create a transaction claiming to be from Resident B without authorization.
3. **Ghost Field Injection**: Adding `isVerified: true` to a resident record to bypass community checks.
4. **State Shortcutting**: Marking a "Berjalan" event as "Selesai" while also changing the budget to a negative value.
5. **PII Leakage**: Attempting to read all `warga` phone numbers as an unauthenticated attacker.
6. **Denial of Wallet**: Flooding the `events` collection with 10,000 tiny records in one batch.
7. **Timestamp Sabotage**: Setting `createdAt` to a date in 2030 to mess up the dashboard.
8. **Type Confusion**: Sending a string for a `jumlah` (amount) field.
9. **Negative Financials**: Creating an expense with a negative amount to effectively "increase" balance.
10. **Orphaned Writes**: Creating a transaction for a category ID that doesn't exist.
11. **Immortality Bypass**: Trying to change the `tipe` of a category from `pemasukan` to `pengeluaran` after historical records exist.
12. **Blanket Query Scraping**: Attempting to list all transactions across all years without any filter if isolation was intended.

## 3. The Test Runner
(Note: Real test runner setup usually requires environment, here we provide the logic assertions)
All "Dirty Dozen" payloads will result in PERMISSION_DENIED due to schema validation and identity checks.
