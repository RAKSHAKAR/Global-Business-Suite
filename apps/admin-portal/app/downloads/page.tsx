"use client";

import { useEffect, useState } from "react";

interface AppRelease {
  id: string;
  appType: string;
  platform: string;
  version: string;
  buildNumber: number;
  isMandatory: boolean;
  releaseNotes: string;
  status: string;
  downloadUrl: string;
  minimumOs: string;
  createdAt: string;
}

export default function DownloadsPage() {
  const [releases, setReleases] = useState<AppRelease[]>([]);
  const [loading, setLoading] = useState(true);

  // New Release Form State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    appType: "CUSTOMER",
    platform: "ANDROID",
    version: "1.0.0",
    buildNumber: 1,
    isMandatory: false,
    releaseNotes: "",
    status: "BETA",
    downloadUrl: "",
    minimumOs: "13.0",
  });

  const fetchReleases = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/v1/releases", {
        headers: { Authorization: `Bearer ${localStorage.getItem("saas_admin_token")}` },
      });
      if (res.ok) {
        setReleases(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:4000/api/v1/releases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("saas_admin_token")}`,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        fetchReleases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this release?")) return;
    try {
      const res = await fetch(`http://localhost:4000/api/v1/releases/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("saas_admin_token")}` },
      });
      if (res.ok) {
        fetchReleases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              App Download Center
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage mobile app releases across Partner and Customer ecosystems
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Release
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">App</th>
                  <th className="px-6 py-4 font-medium">Platform</th>
                  <th className="px-6 py-4 font-medium">Version (Build)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Mandatory</th>
                  <th className="px-6 py-4 font-medium">Download</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading releases...
                    </td>
                  </tr>
                ) : releases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No app releases found.
                    </td>
                  </tr>
                ) : (
                  releases.map((rel) => (
                    <tr
                      key={rel.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {rel.appType}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${rel.platform === "IOS" ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"}`}
                        >
                          {rel.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rel.version} ({rel.buildNumber})
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${rel.status === "PRODUCTION" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"}`}
                        >
                          {rel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {rel.isMandatory ? (
                          <span className="text-red-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {rel.downloadUrl ? (
                          <a
                            href={rel.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(rel.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                New App Release
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    App Type
                  </label>
                  <select
                    value={form.appType}
                    onChange={(e) =>
                      setForm({ ...form, appType: e.target.value })
                    }
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="CUSTOMER">Customer App</option>
                    <option value="PARTNER">Partner App</option>
                    <option value="ADMIN">Admin App</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={form.platform}
                    onChange={(e) =>
                      setForm({ ...form, platform: e.target.value })
                    }
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="ANDROID">Android</option>
                    <option value="IOS">iOS</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    required
                    value={form.version}
                    onChange={(e) =>
                      setForm({ ...form, version: e.target.value })
                    }
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. 1.0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Build #
                  </label>
                  <input
                    type="number"
                    required
                    value={form.buildNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        buildNumber: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="BETA">Beta</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="ROLLED_BACK">Rolled Back</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Download URL
                </label>
                <input
                  type="url"
                  value={form.downloadUrl}
                  onChange={(e) =>
                    setForm({ ...form, downloadUrl: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={form.isMandatory}
                  onChange={(e) =>
                    setForm({ ...form, isMandatory: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor="isMandatory"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Mandatory Update (force users to upgrade)
                </label>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Publish Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
