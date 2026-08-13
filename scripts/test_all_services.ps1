# Comprehensive End-to-End Test Suite for Vanguard Enterprise Platform

$results = @()

function Record-Test ($name, $success, $details) {
    $status = if ($success) { "PASS" } else { "FAIL" }
    $icon = if ($success) { "✅" } else { "❌" }
    $global:results += [PSCustomObject]@{
        TestName = $name
        Status   = "$icon $status"
        Details  = $details
    }
    Write-Host "$icon [$status] $name - $details"
}

Write-Host "========================================================="
Write-Host " STARTING EXHAUSTIVE AUTOMATED VERIFICATION SUITE"
Write-Host "========================================================="

# 1. Test API CAPTCHA Generation
try {
    $captcha = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/auth/captcha" -Method Get
    if ($captcha.id -and $captcha.image) {
        Record-Test "1. Image CAPTCHA API" $true "ID: $($captcha.id), AudioURL: $($captcha.audioUrl)"
        $global:captchaId = $captcha.id
    } else {
        Record-Test "1. Image CAPTCHA API" $false "Missing captcha ID or image"
    }
} catch {
    Record-Test "1. Image CAPTCHA API" $false $_.Exception.Message
}

# 2. Test Audio CAPTCHA WAV Stream
try {
    if ($global:captchaId) {
        $audioRes = Invoke-WebRequest -Uri "http://127.0.0.1:4000/api/v1/auth/captcha/audio/$($global:captchaId)" -Method Get
        if ($audioRes.StatusCode -eq 200 -and $audioRes.Headers['Content-Type'] -eq 'audio/wav') {
            Record-Test "2. Audio CAPTCHA WAV Stream" $true "Status 200, Content-Type: audio/wav, Length: $($audioRes.RawContentLength) bytes"
        } else {
            Record-Test "2. Audio CAPTCHA WAV Stream" $false "Unexpected headers or status"
        }
    }
} catch {
    Record-Test "2. Audio CAPTCHA WAV Stream" $false $_.Exception.Message
}

# 3. Test Admin Authentication with CAPTCHA Bypass
try {
    $adminLogin = @{ email = "admin@enterprise.com"; password = "Admin@1234!"; captchaId = "test-id"; captchaToken = "dev-token" } | ConvertTo-Json
    $adminRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/auth/login" -Method Post -Body $adminLogin -ContentType "application/json"
    if ($adminRes.token -and $adminRes.user.email -eq 'admin@enterprise.com') {
        Record-Test "3. Admin Authentication" $true "JWT Token Issued, Role: Super Admin"
        $global:adminToken = $adminRes.token
    } else {
        Record-Test "3. Admin Authentication" $false "Missing token or incorrect email"
    }
} catch {
    Record-Test "3. Admin Authentication" $false $_.Exception.Message
}

# 4. Test Customer Google SSO Login
try {
    $googleBody = @{ idToken = "mock-google-token"; email = "customer@demo.com"; firstName = "John"; lastName = "Doe"; captchaId = "test-id"; captchaToken = "dev-token" } | ConvertTo-Json
    $googleRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/auth/google-login" -Method Post -Body $googleBody -ContentType "application/json"
    if ($googleRes.token) {
        Record-Test "4. Customer Google SSO" $true "JWT Token Issued for Customer Account"
    } else {
        Record-Test "4. Customer Google SSO" $false "Missing token"
    }
} catch {
    Record-Test "4. Customer Google SSO" $false $_.Exception.Message
}

# 5. Test Multi-Factor Authentication (MFA) Setup
try {
    $headers = @{ Authorization = "Bearer $($global:adminToken)" }
    $mfaRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/auth/mfa/setup" -Method Post -Headers $headers
    if ($mfaRes.secret -and $mfaRes.recoveryCodes.Length -eq 8) {
        Record-Test "5. MFA TOTP Setup" $true "Secret Generated (Len: $($mfaRes.secret.Length)), 8 Recovery Codes Generated"
    } else {
        Record-Test "5. MFA TOTP Setup" $false "MFA payload incomplete"
    }
} catch {
    Record-Test "5. MFA TOTP Setup" $false $_.Exception.Message
}

# 6. Test Dynamic RBAC Query
try {
    $rolesRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/roles" -Method Get -Headers $headers
    if ($rolesRes.data.Length -ge 1) {
        Record-Test "6. Dynamic RBAC Query" $true "Retrieved $($rolesRes.data.Length) System & Tenant Roles"
    } else {
        Record-Test "6. Dynamic RBAC Query" $false "No roles returned"
    }
} catch {
    Record-Test "6. Dynamic RBAC Query" $false $_.Exception.Message
}

# 7. Test Centralized Audit Logs Query
try {
    $logsRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/audit-logs" -Method Get -Headers $headers
    if ($logsRes.data) {
        Record-Test "7. Centralized Audit Logs" $true "Retrieved Audit Log Data Table Records"
    } else {
        Record-Test "7. Centralized Audit Logs" $false "Failed to fetch logs"
    }
} catch {
    Record-Test "7. Centralized Audit Logs" $false $_.Exception.Message
}

# 8. Test Audit Log CSV Export Stream
try {
    $csvRes = Invoke-WebRequest -Uri "http://127.0.0.1:4000/api/v1/audit-logs/export" -Method Get -Headers $headers
    if ($csvRes.StatusCode -eq 200 -and $csvRes.Headers['Content-Type'] -like '*csv*') {
        Record-Test "8. Audit Log CSV Export" $true "Content-Type: $($csvRes.Headers['Content-Type']), Size: $($csvRes.RawContentLength) bytes"
    } else {
        Record-Test "8. Audit Log CSV Export" $false "Invalid CSV stream"
    }
} catch {
    Record-Test "8. Audit Log CSV Export" $false $_.Exception.Message
}

# 9. Test Marketing Lead Ingestion
try {
    $leadBody = @{ firstName = "John"; lastName = "Wick"; email = "john@continental.com"; phone = "+919988776655"; notes = "Enterprise Security Demo Request"; captchaId = "test-id"; captchaToken = "dev-token" } | ConvertTo-Json
    $leadRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/leads" -Method Post -Body $leadBody -ContentType "application/json"
    if ($leadRes.success -and $leadRes.leadId) {
        Record-Test "9. Automated Lead Capture" $true "Lead Registered (ID: $($leadRes.leadId))"
    } else {
        Record-Test "9. Automated Lead Capture" $false "Lead creation failed"
    }
} catch {
    Record-Test "9. Automated Lead Capture" $false $_.Exception.Message
}

# 10. Test Lead Pipeline Fetching
try {
    $pipelineRes = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/v1/leads" -Method Get -Headers $headers
    if ($pipelineRes.data.Length -ge 1) {
        Record-Test "10. Admin Lead Pipeline" $true "Pipeline Contains $($pipelineRes.data.Length) Inbound Leads"
    } else {
        Record-Test "10. Admin Lead Pipeline" $false "Pipeline empty"
    }
} catch {
    Record-Test "10. Admin Lead Pipeline" $false $_.Exception.Message
}

# 11. Test Web Application HTTP Ports Health
$ports = @(
    @{ Name = "Admin Portal";     Port = 3000 },
    @{ Name = "Partner Portal";   Port = 3001 },
    @{ Name = "Customer Portal";  Port = 3002 },
    @{ Name = "Web Portal";       Port = 3003 },
    @{ Name = "API Backend";      Port = 4000 },
    @{ Name = "Admin Mobile";     Port = 8081 },
    @{ Name = "Partner Mobile";   Port = 8082 },
    @{ Name = "Customer Mobile";  Port = 8083 }
)

foreach ($p in $ports) {
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$($p.Port)" -Method Get -TimeoutSec 3 -ErrorAction Stop
        Record-Test "Port $($p.Port) - $($p.Name)" $true "HTTP Status $($res.StatusCode)"
    } catch {
        Record-Test "Port $($p.Port) - $($p.Name)" $false $_.Exception.Message
    }
}

Write-Host "========================================================="
Write-Host " SUMMARY VERIFICATION TABLE"
Write-Host "========================================================="
$global:results | Format-Table -AutoSize
