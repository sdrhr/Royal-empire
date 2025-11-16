document.addEventListener("DOMContentLoaded", () => {
  // ✅ Get type and method from URL
  const params = new URLSearchParams(window.location.search);
  const transactionType = params.get("type") || "deposit";
  const paymentMethod = params.get("method") || "easypaisa";

  // ✅ UI Elements
  const titleEl = document.getElementById("transaction-page-title");
  const summaryTypeEl = document.getElementById("summary-type");
  const summaryMethodEl = document.getElementById("summary-method");
  const accountLabelEl = document.getElementById("transaction-account-label");
  const fileUploadSection = document.getElementById("fileUploadSection");
  const accountInput = document.getElementById("transaction-account-info");
  const amountInput = document.getElementById("transaction-amount");
  const form = document.getElementById("transaction-page-form");

  // ✅ Method details
  const methodNames = {
    easypaisa: "EasyPaisa",
    jazzcash: "JazzCash",
    bank: "Bank Transfer"
  };

  const accountLabels = {
    easypaisa: "EasyPaisa Number",
    jazzcash: "JazzCash Number",
    bank: "Bank Account Number"
  };

  const accountPlaceholders = {
    easypaisa: "Enter your EasyPaisa number",
    jazzcash: "Enter your JazzCash number",
    bank: "Enter your Bank Account"
  };

  // ✅ Initialize UI
  if (titleEl) titleEl.textContent = transactionType === "deposit" ? "Complete Deposit" : "Complete Withdrawal";
  if (summaryTypeEl) summaryTypeEl.textContent = transactionType === "deposit" ? "Deposit" : "Withdrawal";
  if (summaryMethodEl) summaryMethodEl.textContent = methodNames[paymentMethod];
  if (accountLabelEl) accountLabelEl.textContent = accountLabels[paymentMethod];
  if (accountInput) accountInput.placeholder = accountPlaceholders[paymentMethod];
  if (fileUploadSection) fileUploadSection.style.display = transactionType === "deposit" ? "block" : "none";

  // ✅ Live Summary Update
  amountInput?.addEventListener("input", () => updateTransactionSummary(transactionType));

  function updateTransactionSummary(type) {
    const amount = parseFloat(amountInput.value) || 0;
    const fee = (amount * 0.02).toFixed(2);
    const total = (amount + parseFloat(fee)).toFixed(2);

    document.getElementById("summary-amount").textContent = `$${amount.toFixed(2)}`;
    document.getElementById("summary-fee").textContent = `$${fee}`;
    document.getElementById("summary-total").textContent = `$${total}`;
  }

  // ✅ Handle Transaction Submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const amount = parseFloat(amountInput.value);
    const account = accountInput.value;

    if (!amount || !account) {
      alert("Please fill in all fields correctly.");
      return;
    }

    // ✅ Create a transaction record
    const newTransaction = {
      id: Date.now(),
      type: transactionType,
      method: methodNames[paymentMethod],
      amount,
      date: new Date().toLocaleString(),
      status: "Pending"
    };

    // ✅ Save to localStorage
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    transactions.push(newTransaction);
    localStorage.setItem("transactions", JSON.stringify(transactions));

    alert("✅ Transaction submitted successfully!");
    window.location.href = "dashboard.html";
  });
});
