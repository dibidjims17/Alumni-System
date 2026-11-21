# Smoke test: Section A of the Graduate Tracer Study - program suggestions,
# graduation-year validation, permanent/current address split, program
# write-back, edit-after-submit (draft save + re-submit), the admin DELETE
# used for cleanup, and the 30-column CSV.
#
# Re-runnable by design: submit locks a row ("already submitted" fails the
# next run), so the script clears CAREER002's tracer row both BEFORE the
# run (survives a crashed previous run) and AFTER it (leaves no test data
# in admin reports; the student's gate re-locks because tracerCompleted is
# derived from the row). FAILURES=0 is the pass condition.
#
# Local dev fixture accounts only (synthetic test rows, not real students).
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5207/api'
$results = @()

function Check($name, $cond, $detail) {
    $script:results += ("{0} {1} :: {2}" -f ($(if ($cond) { 'PASS' } else { 'FAIL' })), $name, $detail)
}

# Admin auth - CSV export and row cleanup both need it (careertest is
# SuperAdmin, which the delete endpoint requires).
$admin = Invoke-RestMethod -Method Post -Uri "$base/admin/login" `
    -ContentType 'application/json' `
    -Body '{"username":"careertest","password":"Test1234!"}'
$ah = @{ Authorization = "Bearer $($admin.token)" }

# Delete the named student's tracer row if one exists. Returns a message
# string so the caller can assert on it.
function Clear-TracerRow([string]$studentNo) {
    $found = Invoke-RestMethod -Method Get `
        -Uri "$base/Tracer/responses?page=1&search=$studentNo" -Headers $ah
    $row = $found.items |
        Where-Object { $_.studentNumber -eq $studentNo } |
        Select-Object -First 1
    if (-not $row) { return 'no row' }
    $del = Invoke-RestMethod -Method Delete `
        -Uri "$base/Tracer/responses/$($row.id)" -Headers $ah
    return $del.message
}

# 0. Pre-clean - CAREER002 must start with no tracer row.
$pre = Clear-TracerRow 'CAREER002'
Write-Output "PRE-CLEAN: $pre"

# 1. Student login. The gate flag must be false now that the row is gone.
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
    -ContentType 'application/json' `
    -Body '{"identifier":"CAREER002","password":"Test1234!"}'
$tok = $login.token
$auth = @{ Authorization = "Bearer $tok" }
Check 'gate re-locked after cleanup' (-not $login.tracerCompleted) $login.tracerCompleted

# 2. Program suggestions: BSIT (any case) must recommend the full name first.
foreach ($term in @('BSIT', 'bsit', 'BS Information Technology', 'BSCPE')) {
    $s = Invoke-RestMethod -Method Get -Uri "$base/Suggestions?term=$([uri]::EscapeDataString($term))&type=program" -Headers $auth
    Check "suggest '$term'" ($s.Count -gt 0) ("[" + ($s -join ' | ') + "]")
}
$s = Invoke-RestMethod -Method Get -Uri "$base/Suggestions?term=BSIT&type=program" -Headers $auth
Check 'BSIT first suggestion is canonical' ($s[0] -eq 'Bachelor of Science in Information Technology') $s[0]

# 3. Validation: bogus year must be rejected with the year message.
$bad = @{
    currentStep = 5; program = 'BSIT'; yearGraduated = 1899
    sex = 'Male'; contactNo = '09171234567'
    permanentAddress = '12 Rizal St, Manila'; presentAddress = '12 Rizal St, Manila'
    employmentStatus = 'Employed (Full-time)'
    companyName = 'Acme Corp'; position = 'Developer'; companyType = 'Private'
    salaryBand = '20k-30k'; monthsToJob = '1-3'; jobSource = 'Online'
    courseRelatedness = 'Related'; courseRelatednessComment = 'Uses IT daily.'
    skillsUsed = 'Computer / Technical'; satisfied = 'Yes'; wouldRecommend = 'Yes'
} | ConvertTo-Json
try {
    $r = Invoke-WebRequest -Method Post -Uri "$base/Tracer/submit" -Headers $auth `
        -ContentType 'application/json' -Body $bad -UseBasicParsing
    Check 'year 1899 rejected' $false ("status=" + $r.StatusCode)
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $stream.Position = 0
    $reader = New-Object System.IO.StreamReader($stream)
    $msg = ($reader.ReadToEnd() | ConvertFrom-Json).message
    Check 'year 1899 rejected' ($msg -like '*graduation year*') $msg
}

# 4. Valid submit with abbreviated program BSIT + both addresses.
$good = @{
    currentStep = 5; program = 'BSIT'; yearGraduated = 2024
    sex = 'Male'; contactNo = '09171234567'; emailOrFb = 'careertest2@mail.test'
    permanentAddress = '12 Rizal St, Manila'; presentAddress = '45 Bonifacio Ave, Quezon City'
    employmentStatus = 'Employed (Full-time)'
    companyName = 'Acme Corp'; position = 'Developer'; companyType = 'Private'
    salaryBand = '20k-30k'; monthsToJob = '1-3'; jobSource = 'Online'
    courseRelatedness = 'Related'; courseRelatednessComment = 'Uses IT daily.'
    skillsUsed = 'Computer / Technical'; satisfied = 'Yes'; wouldRecommend = 'Yes'
} | ConvertTo-Json
$submit = Invoke-RestMethod -Method Post -Uri "$base/Tracer/submit" -Headers $auth `
    -ContentType 'application/json' -Body $good
Check 'submit ok' ($submit.message -like '*submitted*') $submit.message

# 5. GET /Tracer/me returns the new Section A fields.
$me = Invoke-RestMethod -Method Get -Uri "$base/Tracer/me" -Headers $auth
Check 'me.yearGraduated=2024' ($me.yearGraduated -eq 2024) $me.yearGraduated
Check 'me.permanentAddress' ($me.permanentAddress -like '*Rizal*') $me.permanentAddress
Check 'me.presentAddress=current' ($me.presentAddress -like '*Bonifacio*') $me.presentAddress
Check 'me.program=account value' ($me.program -eq 'Bachelor of Science in Information Technology') $me.program
$firstSubmittedAt = $me.submittedAt

# 5b. Edit after submit (Q2): a draft save on a Submitted row must NOT
#     demote the status (gate stays open), and a re-submit must UPDATE
#     the row with a bumped SubmittedAt instead of being rejected.
$edit = $good | ConvertFrom-Json
$edit.position = 'Senior Developer'
$editBody = $edit | ConvertTo-Json -Depth 5
$draft = Invoke-RestMethod -Method Put -Uri "$base/Tracer/draft" -Headers $auth `
    -ContentType 'application/json' -Body $editBody
Check 'draft save on submitted row ok' ($draft.message -like '*Draft saved*') $draft.message

# Re-login: tracerCompleted must still be True - proves the draft save
# kept Status=Submitted (a demotion would re-lock the gate here).
$login2 = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
    -ContentType 'application/json' `
    -Body '{"identifier":"CAREER002","password":"Test1234!"}'
Check 'gate stays open mid-edit' ($login2.tracerCompleted -eq $true) $login2.tracerCompleted

# Second-level sleep so the stored SubmittedAt second must change.
Start-Sleep -Milliseconds 1200
$update = Invoke-RestMethod -Method Post -Uri "$base/Tracer/submit" -Headers $auth `
    -ContentType 'application/json' -Body $editBody
Check 're-submit updates (not rejected)' ($update.message -like '*updated*') $update.message

$me2 = Invoke-RestMethod -Method Get -Uri "$base/Tracer/me" -Headers $auth
Check 'edited position persisted' ($me2.position -eq 'Senior Developer') $me2.position
Check 'SubmittedAt bumped on update' `
    ([datetime]::Parse($me2.submittedAt) -gt [datetime]::Parse($firstSubmittedAt)) `
    "$firstSubmittedAt -> $($me2.submittedAt)"

# 6. Admin: CSV export must have 30 columns in header and 30 cells per row.
$csv = (Invoke-WebRequest -Method Get -Uri "$base/Tracer/export" -Headers $ah -UseBasicParsing).Content
$lines = $csv -split "`r?`n" | Where-Object { $_ -ne '' }
# Data rows quote every cell (split on ","), the header joins plain names
# (split on ,) - accept either shape.
$headerCount = ($lines[0] -split '","').Count
if ($headerCount -eq 1) { $headerCount = ($lines[0] -split ',').Count }
Check 'CSV header 30 cols' ($headerCount -eq 30) "cols=$headerCount"
$careeerRow = $lines | Where-Object { $_ -like '*CAREER002*' } | Select-Object -First 1
$cellCount = ($careeerRow -split '","').Count
Check 'CAREER002 row 30 cells' ($cellCount -eq 30) "cells=$cellCount"
Check 'CSV row has 2024 + permanent addr' ($careeerRow -like '*2024*' -and $careeerRow -like '*Rizal*') 'found year+address'
Check 'CSV row has edited position' ($careeerRow -like '*Senior Developer*') 'position edit exported'

# 7. Cleanup: delete the smoke row so reports stay clean and the next run
#    starts from step 0. The row must be gone from the admin table after.
$post = Clear-TracerRow 'CAREER002'
Check 'cleanup deleted smoke row' ($post -like '*Deleted*') $post
$left = Invoke-RestMethod -Method Get -Uri "$base/Tracer/responses?page=1&search=CAREER002" -Headers $ah
Check 'CAREER002 row gone' ($left.total -eq 0) "total=$($left.total)"

$results
$failures = ($results | Where-Object { $_ -like 'FAIL*' }).Count
Write-Output ("FAILURES=" + $failures)
if ($failures -gt 0) { exit 1 }
