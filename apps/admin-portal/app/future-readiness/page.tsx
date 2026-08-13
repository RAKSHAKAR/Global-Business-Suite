"use client";

import React from "react";

export default function FutureReadinessPage() {
  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Future Readiness: Digital Twin, IoT & Blockchain
          </h1>
          <p className="text-sm text-gray-400">
            Enterprise architecture monitoring for business operational simulations, MQTT IoT sensor telemetry, and Hyperledger blockchain audit ledger.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Digital Twin</div>
            <h3 className="text-lg font-semibold text-white">Operational Simulation</h3>
            <p className="text-sm text-gray-400">
              Run predictive financial forecasting, supply chain load simulations, and automated business scenario stress tests.
            </p>
            <div className="bg-gray-950 p-3 rounded text-xs text-emerald-400 font-mono">
              Model: Q4 ARR Simulation (Confidence: 96.4%)
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">IoT Platform</div>
            <h3 className="text-lg font-semibold text-white">MQTT Telemetry Stream</h3>
            <p className="text-sm text-gray-400">
              Connect industrial equipment, sensors, gateways, and asset tracking devices directly into GBS Workflow Engine.
            </p>
            <div className="bg-gray-950 p-3 rounded text-xs text-emerald-400 font-mono">
              Devices: 1 online (HVAC Temp Sensor: 21.5°C)
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">Blockchain Ledger</div>
            <h3 className="text-lg font-semibold text-white">Immutable Audit Certificates</h3>
            <p className="text-sm text-gray-400">
              Cryptographically signed audit logs, identity verifications, and digital certificates backed by private Hyperledger ledger.
            </p>
            <div className="bg-gray-950 p-3 rounded text-xs text-emerald-400 font-mono truncate">
              Latest Block: #1045231 (SHA256: 0x8a3f91...)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
