document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transaction-form");
  const msg = document.getElementById("transaction-message");
  const historyDiv = document.getElementById("transaction-history");
  const balanceEl = document.getElementById("total-balance");
  const eusdtEl = document.getElementById("eusdt-balance");
  const ssInput = document.getElementById("screenshot");
  const ssPreview = document.getElementById("ss-preview");
  const depositBox = document.getElementById("deposit-number-box");
  const uploadBox = document.getElementById("ss-upload-box");

  // 🔥 FIXED LOGIN USER FETCH
let royalUser = localStorage.getItem("royalEmpireUser");

if (!royalUser) {
    console.error("❌ No user found in localStorage");
}

let parsedUser = {};
try {
    parsedUser = JSON.parse(royalUser);
} catch (err) {
    console.error("❌ JSON Parse Error:", err);
}

function getSafeEmail(userObj) {
    if (!userObj) return null;

    // FIX 1 → email might be {} in your database
    if (typeof userObj.email === "string") {
        return userObj.email.trim().toLowerCase();
    }

    // FIX 2 → email stored inside username
    if (typeof userObj.username === "string" && userObj.username.includes("@")) {
        return userObj.username.trim().toLowerCase();
    }

    console.error("❌ No valid email found in user object:", userObj);
    return null;
}


  const USDT_TO_PKR = 300;
  const API_BASE = "https://royal-empire-11.onrender.com";



  // -------------------------------
  // Convert USDT → PKR
  // -------------------------------
  const usdtInput = document.getElementById("amount");
  const convertedAmountEl = document.getElementById("converted-amount");

  if (usdtInput && convertedAmountEl) {
    usdtInput.addEventListener("input", () => {
      const val = parseFloat(usdtInput.value) || 0;
      const pkr = val * USDT_TO_PKR;
      convertedAmountEl.textContent = val
        ? `≈ Rs. ${pkr.toLocaleString()} PKR`
        : "≈ Rs. 0.00 PKR";
    });
  }

  // -------------------------------
  // Screenshot preview
  // -------------------------------
  if (ssInput && ssPreview) {
    ssInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        ssPreview.src = URL.createObjectURL(file);
        ssPreview.style.display = "block";
      }
    });
  }

  // -------------------------------
  // Show/hide deposit fields
  // -------------------------------
  const txTypeSelect = document.getElementById("transaction-type");
  if (txTypeSelect) {
    txTypeSelect.addEventListener("change", (e) => {
      const isDeposit = e.target.value === "deposit";
      depositBox.style.display = isDeposit ? "block" : "none";
      uploadBox.style.display = isDeposit ? "block" : "none";
    });
  }

  // -------------------------------
  // Load User Data
  // -------------------------------
async function loadUserData() {
    const safeEmail = getSafeEmail(parsedUser);

    if (!safeEmail) {
        console.log("⚠️ Cannot load user → Email missing");
        return;
    }

    console.log("📩 Fetching user data using:", safeEmail);

    try {
        const res = await fetch(`https://royal-empire-11.onrender.com/api/user/${safeEmail}`);

        if (!res.ok) throw new Error("User fetch error");

        const data = await res.json();
        console.log("✅ User Data Loaded:", data);

        document.getElementById("balance").innerText = data.balance || 0;
        document.getElementById("eusdt").innerText = data.eusdtBalance || 0

    if (historyDiv && data.transactions?.length) {
      historyDiv.innerHTML = data.transactions
        .slice()
        .reverse()
        .map(
          (t) => `
            <div class="transaction-entry ${t.type}">
              <div class="left">
                <strong>${t.type.toUpperCase()}</strong> - $${t.amount.toFixed(2)}
              </div>
              <div class="right">
                <div>${new Date(t.createdAt).toLocaleString()}</div>
                <div>Status: ${t.status}</div>
              </div>
            </div>`
        )
        .join("");
    } else {
      historyDiv.innerHTML = "<p>No transactions yet.</p>";
    }
  } catch (err) {
    console.error("❌ loadUserData error:", err);
  }
}
  loadUserData();


  // -------------------------------
  // Submit Transaction
  // -------------------------------
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const type = document.getElementById("transaction-type").value;
      const method = document.getElementById("payment-method").value;
      const userNumber = document.getElementById("user-number").value.trim();
      const amount = parseFloat(document.getElementById("amount").value);
      const file = ssInput?.files[0];

      if (!type || !method || !userNumber || !amount) {
        msg.textContent = "⚠️ Please fill all fields.";
        msg.style.color = "red";
        return;
      }

      if (type === "deposit" && !file) {
        msg.textContent = "⚠️ Upload screenshot for deposit.";
        msg.style.color = "red";
        return;
      }

      // Build form data
      const formData = new FormData();
      formData.append("email", email);
      formData.append("type", type);
      formData.append("method", method);
      formData.append("userNumber", userNumber);
      formData.append("amount", amount);

      if (file && type === "deposit") {
        formData.append("screenshot", file);
      }

      msg.textContent = "Processing...";
      msg.style.color = "yellow";

      try {
        const res = await fetch(`${API_BASE}/api/transactions`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          msg.textContent = data.message;
          msg.style.color = "lime";
          form.reset();
          ssPreview.style.display = "none";
          loadUserData();
        } else {
          msg.textContent = data.message || "Transaction failed.";
          msg.style.color = "red";
        }
      } catch (err) {
        msg.textContent = "Server error.";
        msg.style.color = "red";
      }
    });
  }

  loadUserData();
  setInterval(loadUserData, 30000);
});
