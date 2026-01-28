console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);


import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import logopic2 from "../assets/logopic2.png";

// ✅ Match MainDashboard env behavior (and allow fallback)
const API =
  (import.meta?.env?.VITE_API_URL ||
    import.meta?.env?.VITE_API_BASE_URL ||
    "").replace(/\/$/, "");

console.log("API BASE (CreateRequest) =", API);

const CATEGORY_OPTIONS = [
  { value: "", label: "Select a category..." },
  { value: "Food", label: "Food & Beverage Supplies" },
  { value: "Music", label: "Music & Instruments" },
  { value: "Construction", label: "Construction Materials" },
  { value: "Electronics", label: "Electronics & Tech" },
  { value: "Office", label: "Office & Stationery" },
  { value: "Industrial", label: "Industrial / Manufacturing" },
  { value: "Home", label: "Home & Household" },
  { value: "Automotive", label: "Automotive Supplies" },
  { value: "Health", label: "Health & Wellness" },
  { value: "Other", label: "Other" },
];

function getToken() {
  return localStorage.getItem("userToken") || localStorage.getItem("token") || "";
}

function normalizeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x.trim();
  if (typeof x === "object" && x._id) return String(x._id);
  return String(x);
}

function pickDefaultAddress(user) {
  const arr = user?.shippingAddresses;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  return (
    arr.find((a) => a?.isDefault === true) ||
    arr.find((a) => a?.default === true) ||
    arr.find((a) => a?.primary === true) ||
    arr[0]
  );
}

function formatShipping(addr) {
  if (!addr) return null;

  const street = addr.street || addr.streetAddress || "";
  const city = addr.city || "";
  const state = addr.state || "";
  const country = addr.country || "";
  const postalCode = addr.postalCode || addr.zip || "";

  const parts = [street, city, state, country, postalCode].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function fetchUserProfile(userId, token) {
  if (!API) {
    console.error("❌ API base is empty. Check Railway env vars (VITE_API_URL).");
    return null;
  }

  const urls = [
    `${API}/api/users/profile/${userId}`,
    `${API}/api/user/profile/${userId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("❌ Profile fetch failed:", res.status, url, txt);
        continue;
      }

      return await res.json();
    } catch (err) {
      console.error("❌ Profile fetch error:", url, err);
    }
  }

  return null;
}

export default function CreateRequest() {
  const navigate = useNavigate();
  const userId = normalizeId(localStorage.getItem("userId"));
  const token = getToken();

  const [form, setForm] = useState({
    productName: "",
    category: "",
    quantity: "",
    condition: "New",
    sizeWeight: "",
    description: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [defaultAddr, setDefaultAddr] = useState(null);

  useEffect(() => {
    if (!userId || !token) navigate("/login");
  }, [userId, token, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      setProfileLoading(true);

      const profile = await fetchUserProfile(userId, token);

      // supports { user: {...} } or {...}
      const userObj = profile?.user || profile;

      const addr = pickDefaultAddress(userObj);
      setDefaultAddr(addr || null);

      setProfileLoading(false);
    };

    if (userId && token) loadProfile();
  }, [userId, token]);

  const defaultShipText = useMemo(() => formatShipping(defaultAddr), [defaultAddr]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!API) {
      alert("API base URL missing. Set VITE_API_URL in Railway for the frontend.");
      return;
    }

    if (!defaultAddr) {
      alert("No default shipping address found. Please add one in Settings.");
      navigate("/settings");
      return;
    }

    const payload = {
      productName: form.productName,
      category: form.category,
      quantity: Number(form.quantity),
      condition: form.condition,
      sizeWeight: form.sizeWeight,
      description: form.description,
      searchName: form.productName,
      shippingAddress: {
        street: defaultAddr.street || defaultAddr.streetAddress || "",
        city: defaultAddr.city || "",
        state: defaultAddr.state || "",
        country: defaultAddr.country || "",
        postalCode: defaultAddr.postalCode || defaultAddr.zip || "",
      },
      clientID: userId,
    };

    try {
      const res = await fetch(`${API}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // ✅ keep your no-hyphen route
        navigate("/dashboard");
        return;
      }

      const txt = await res.text().catch(() => "");
      console.error("❌ Create request failed:", res.status, txt);
      alert(`Error creating request (${res.status})`);
    } catch (err) {
      console.error("❌ Create request network error:", err);
      alert("Network error creating request");
    }
  };

  return (
    <div className="min-h-screen bg-[#050017] text-white pt-24 px-5 pb-20 relative">
      <div className="flex justify-center mb-8 mt-6">
        <img src={logopic2} alt="MerqNet Logo" className="w-32" />
      </div>

      <div className="max-w-xl mx-auto bg-[#0B001F]/90 border border-cyan-500/30 rounded-3xl p-8 relative">
        <button
          onClick={() => navigate("/dashboard")}
          className="absolute -top-12 left-1 p-2 text-white"
        >
          <ChevronLeft />
        </button>

        <h1 className="text-3xl font-bold text-cyan-300 text-center mb-8">
          Create Request
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="productName"
            placeholder="Product Name"
            value={form.productName}
            onChange={handleChange}
            required
          />

          <select
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="text-black">
                {o.label}
              </option>
            ))}
          </select>

          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="quantity"
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={handleChange}
            required
          />

          <select
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="condition"
            value={form.condition}
            onChange={handleChange}
          >
            <option className="text-black">New</option>
            <option className="text-black">Used</option>
          </select>

          <input
            className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="sizeWeight"
            value={form.sizeWeight}
            onChange={handleChange}
            placeholder="Size / Weight"
          />

          <textarea
            className="w-full min-h-[110px] rounded-xl bg-white/10 border border-white/15 px-4 py-3 outline-none focus:border-cyan-400"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
          />

          <div className="border border-white/15 bg-white/5 p-3 rounded-xl text-sm">
            {profileLoading
              ? "Loading address..."
              : defaultShipText
              ? `Default shipping address: ${defaultShipText}`
              : "No default shipping address found."}
          </div>

          <button className="w-full bg-cyan-500 hover:bg-cyan-400 transition py-3 rounded-xl font-semibold">
            Create Request
          </button>
        </form>
      </div>
    </div>
  );
}
