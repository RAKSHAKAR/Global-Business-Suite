"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useRouter } from "next/navigation";

export default function TenantDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { token } = useAuth();
  const router = useRouter();

  const [tenant, setTenant] = useState<any>(null);
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [tenantConfigs, setTenantConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // We would ideally fetch the specific tenant, but here we just fetch all and find
      const [tenantsRes, providersRes, configsRes] = await Promise.all([
        fetch("http://localhost:4000/api/tenants", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("http://localhost:4000/api/ai-providers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/tenant-ai/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const tenants = await tenantsRes.json();
      const providers = await providersRes.json();
      const configs = await configsRes.json();

      setTenant(tenants.find((t: any) => t.id === id));
      setAiProviders(providers);
      setTenantConfigs(configs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [id, token]);

  const handleUpdateConfig = async (providerId: string, updates: any) => {
    try {
      await fetch(`http://localhost:4000/api/tenant-ai/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ providerId, ...updates }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to update config");
    }
  };

  if (loading) return <div>Loading tenant details...</div>;
  if (!tenant) return <div>Tenant not found.</div>;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <button
            onClick={() => router.push("/tenants")}
            className="text-[#D4AF37] hover:underline text-sm mb-2"
          >
            &larr; Back to Tenants
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {tenant.name} - Configuration
          </h1>
          <p className="text-gray-500 mt-1">
            Domain: {tenant.domain} | ID: {tenant.id}
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          AI Service Overrides & Quotas
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Configure which AI providers this tenant can access and define monthly
          limits.
        </p>

        <div className="space-y-6">
          {aiProviders.map((provider) => {
            const config = tenantConfigs.find(
              (c) => c.providerId === provider.id,
            );
            const isActive = config ? config.isActive : provider.isActive;
            const quota = config ? config.quotaMonthly : 0;
            const overrideKey = config ? config.overrideKey : "";

            return (
              <div
                key={provider.id}
                className="border border-gray-200 rounded-lg p-5 bg-gray-50 flex flex-col md:flex-row gap-6"
              >
                <div className="md:w-1/3">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {provider.name}
                    </h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded uppercase font-semibold">
                      {provider.providerKey}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Global status: {provider.isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activation Override
                    </label>
                    <select
                      value={isActive.toString()}
                      onChange={(e) =>
                        handleUpdateConfig(provider.id, {
                          isActive: e.target.value === "true",
                          quotaMonthly: quota,
                          overrideKey,
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    >
                      <option value="true">Active for Tenant</option>
                      <option value="false">Disabled for Tenant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Quota (0 = Unlimited)
                    </label>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) =>
                        handleUpdateConfig(provider.id, {
                          isActive,
                          quotaMonthly: parseInt(e.target.value) || 0,
                          overrideKey,
                        })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom API Key Override (Optional)
                    </label>
                    <input
                      type="password"
                      value={overrideKey || ""}
                      onChange={(e) =>
                        handleUpdateConfig(provider.id, {
                          isActive,
                          quotaMonthly: quota,
                          overrideKey: e.target.value,
                        })
                      }
                      placeholder="Enter a custom key for this tenant only..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {aiProviders.length === 0 && (
            <p className="text-gray-500">
              No global AI providers configured. Go to AI Engines to add them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
