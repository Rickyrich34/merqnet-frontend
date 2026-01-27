import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import logopic2 from "../assets/logopic2.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

function normalizeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x.trim();
  if (typeof x === "object" && x._id) return String(x._id).trim();
  return String(x).trim();
}

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("userToken") || "";
}

function pickDefaultAddress(user) {
  const arr = user?.shippingAddresses;
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const found =
    arr.find(a => a?.isDefault === true) ||
    arr.find(a => a?.default === true) ||
    arr.find(a => a?.is_default === true) ||
    arr.find(a => a?.primary === true) ||
    arr.find(a => String(a?.isDefault).toLowerCase() === "true") ||
    arr.find(a => String(a?.default).toLowerCase() === "true");

  return found || arr[0];
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
  const urls = [
    `${API_BASE_URL}/api/users/profile/${userId}`,
    `${API_BASE_URL}/api/user/profile/${userId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {}
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
      try {
        setProfileLoading(true);
        const userProfile = await fetchUserProfile(userId, token);

        console.log("USER PROFILE:", userProfile);

        const addr = pickDefaultAddress(userProfile);
        setDefaultAddr(addr || null);
      } finally {
        setProfileLoading(false);
      }
    };

    if (userId && token) loadProfile();
  }, [userId, token]);

  const defaultShipText = useMemo(
    () => formatShipping(defaultAddr),
    [defaultAddr]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!defaultAddr || !defaultShipText) {
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

    const res = await fetch(`${API_BASE_URL}/api/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) navigate("/buyerdashboard");
    else alert("Error creating request");
  };

  return (
    <div className="min-h-screen bg-[#050017] text-white pt-24 px-5 pb-20">
      <div className="flex justify-center mb-8 mt-6">
        <img src={logopic2} alt="MerqNet Logo" className="w-32" />
      </div>

      <div className="max-w-xl mx-auto bg-[#0B001F]/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-10 relative">
        <button
          onClick={() => navigate("/buyer-dashboard")}
          className="absolute -top-12 left-1 p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-3xl font-bold text-cyan-300 text-center mb-8">
          Create Request
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input name="productName" value={form.productName} onChange={handleChange} required />
          <select name="category" value={form.category} onChange={handleChange} required>
            {CATEGORY_OPTIONS.map(opt => (
              <option key={opt.value || "x"} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input name="quantity" type="number" value={form.quantity} onChange={handleChange} required />

          <div className="bg-[#06001a] border border-cyan-700/40 rounded-xl p-4 text-sm">
            {profileLoading ? (
              "Loading default shipping address..."
            ) : defaultShipText ? (
              <>Default shipping address: {defaultShipText}</>
            ) : (
              <>No default shipping address found.</>
            )}
          </div>

          <button type="submit" className="w-full bg-cyan-500 text-black py-3 rounded-xl">
            Create Request
          </button>
        </form>
      </div>
    </div>
  );
}
