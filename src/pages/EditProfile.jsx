import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const EditProfile = () => {
  const navigate = useNavigate();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://merqnet-backend-production.up.railway.app";

  const token =
    localStorage.getItem("userToken") || localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    internationalTrading: false,
    shippingAddresses: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError("");

        if (!token || !userId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load profile");

        setForm({
          name: data?.name || "",
          email: data?.email || "",
          phone: data?.phone || "",
          internationalTrading: !!data?.internationalTrading,
          shippingAddresses: Array.isArray(data?.shippingAddresses)
            ? data.shippingAddresses
            : [],
        });
      } catch (e) {
        console.error("EditProfile load error:", e);
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [API_BASE, token, userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const updateAddress = (idx, key, value) => {
    setForm((prev) => {
      const copy = [...prev.shippingAddresses];
      copy[idx] = { ...copy[idx], [key]: value };
      return { ...prev, shippingAddresses: copy };
    });
  };

  const addAddress = () => {
    setForm((prev) => {
      const current = Array.isArray(prev.shippingAddresses)
        ? prev.shippingAddresses
        : [];
      if (current.length >= 3) return prev;

      const newOne = {
        streetAddress: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        isDefault: current.length === 0,
      };

      return { ...prev, shippingAddresses: [...current, newOne] };
    });
  };

  const removeAddress = (idx) => {
    setForm((prev) => {
      const copy = [...prev.shippingAddresses];
      copy.splice(idx, 1);

      // ensure 1 default if any remain
      if (copy.length > 0 && !copy.some((a) => a.isDefault)) {
        copy[0].isDefault = true;
      }

      return { ...prev, shippingAddresses: copy };
    });
  };

  const setDefaultAddress = (idx) => {
    setForm((prev) => {
      const copy = prev.shippingAddresses.map((a, i) => ({
        ...a,
        isDefault: i === idx,
      }));
      return { ...prev, shippingAddresses: copy };
    });
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      setError("");

      if (!token || !userId) {
        setError("Not logged in.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to save changes");

      navigate("/profile");
    } catch (e) {
      console.error("EditProfile save error:", e);
      setError(e.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/70">Loading...</div>
      </div>
    );
  }

  if (!token || !userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/70">You are not logged in.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0016] via-[#120027] to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 backdrop-blur-md">
          <h1 className="text-3xl font-extrabold text-fuchsia-200">
            Edit Profile
          </h1>

          {error && (
            <div className="mt-4 bg-red-500/15 border border-red-500/40 text-red-200 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-sm text-white/80">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/80">Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/80">
                Phone (include country code)
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                placeholder="+1 787..."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="internationalTrading"
                checked={form.internationalTrading}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="text-white/80">
                Available for international trading
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-fuchsia-300">
                  Shipping Addresses
                </h2>
                <button
                  onClick={addAddress}
                  className="px-4 py-2 rounded-xl bg-fuchsia-500/70 hover:bg-fuchsia-500 font-semibold"
                >
                  Add Address
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                {form.shippingAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-white/80">
                        Address #{idx + 1}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setDefaultAddress(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            addr.isDefault
                              ? "bg-emerald-500/70"
                              : "bg-white/10 hover:bg-white/15"
                          }`}
                        >
                          {addr.isDefault ? "Default" : "Set Default"}
                        </button>

                        <button
                          onClick={() => removeAddress(idx)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/30 hover:bg-red-500/40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <input
                        value={addr.streetAddress || ""}
                        onChange={(e) =>
                          updateAddress(idx, "streetAddress", e.target.value)
                        }
                        placeholder="Street Address"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                      />
                      <input
                        value={addr.city || ""}
                        onChange={(e) =>
                          updateAddress(idx, "city", e.target.value)
                        }
                        placeholder="City"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                      />
                      <input
                        value={addr.state || ""}
                        onChange={(e) =>
                          updateAddress(idx, "state", e.target.value)
                        }
                        placeholder="State / Province"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                      />
                      <input
                        value={addr.country || ""}
                        onChange={(e) =>
                          updateAddress(idx, "country", e.target.value)
                        }
                        placeholder="Country"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                      />
                      <input
                        value={addr.postalCode || ""}
                        onChange={(e) =>
                          updateAddress(idx, "postalCode", e.target.value)
                        }
                        placeholder="Postal Code"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                ))}

                {form.shippingAddresses.length === 0 && (
                  <div className="text-white/70 text-sm">
                    No addresses yet. Add one.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => navigate("/profile")}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 font-semibold disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <button
              onClick={() => navigate("/changepassword")}
              className="mt-3 text-left text-sm text-fuchsia-300 hover:text-fuchsia-200 underline"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
