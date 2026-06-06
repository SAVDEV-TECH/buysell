"use server";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function fetchPaystackBanks() {
  try {
    if (!PAYSTACK_SECRET) {
      throw new Error("Paystack Secret Key is missing from server environment.");
    }

    const res = await fetch("https://api.paystack.co/bank", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("fetchPaystackBanks Error:", err);
    return { status: false, message: err.message || "Failed to fetch banks" };
  }
}

export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  try {
    if (!PAYSTACK_SECRET) {
      throw new Error("Paystack Secret Key is missing from server environment.");
    }

    // Input validation
    if (!accountNumber || typeof accountNumber !== "string") {
      throw new Error("Account number is required and must be a string");
    }

    if (!bankCode || typeof bankCode !== "string") {
      throw new Error("Bank code is required and must be a string");
    }

    // Validate account number format (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new Error("Account number must be exactly 10 digits");
    }

    // Validate bank code format (3 digits)
    if (!/^\d{3}$/.test(bankCode)) {
      throw new Error("Bank code must be exactly 3 digits");
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedAccountNumber = accountNumber.replace(/[^\d]/g, "");
    const sanitizedBankCode = bankCode.replace(/[^\d]/g, "");

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${sanitizedAccountNumber}&bank_code=${sanitizedBankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      if (res.status === 400) {
        throw new Error("Invalid account number or bank code format");
      } else if (res.status === 401) {
        throw new Error("Authentication error with payment provider");
      } else if (res.status === 404) {
        throw new Error("Account not found or does not exist");
      }
      throw new Error(`Payment provider error: ${res.statusText}`);
    }

    const data = await res.json();

    // Validate response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response from payment provider");
    }

    // Additional validation: ensure account name is returned and is reasonable
    if (data.status && data.data && typeof data.data.account_name !== "string") {
      throw new Error("Unable to resolve account details");
    }

    return data;
  } catch (err: any) {
    console.error("resolveBankAccount Error:", err);
    return { status: false, message: err.message || "Failed to resolve bank account" };
  }
}
