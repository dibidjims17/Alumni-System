# Seeds the demo tracer response for CAREER001 (ACME Corp) - the row the
# admin Tracer Study screen, stats cards and CSV export are reviewed
# against.
#
# CAREER001's original row predates the Section A revamp (no graduation
# year, no permanent address, abbreviated program), and submit locks a row
# against re-submission. So when the row is stale this script deletes it
# through the admin DELETE endpoint and submits a full replacement, which
# also normalizes the account's Program through ProgramCatalog write-back.
#
# Idempotent: exits early once the row already carries Section A data -
# safe to re-run after a database restore.
#
# Local dev fixture accounts only (synthetic test rows, not real students).
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5207/api'
$canonicalProgram = 'Bachelor of Science in Information Technology'

# --- Is the row already current? ----------------------------------------
$student = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
    -ContentType 'application/json' `
    -Body '{"identifier":"CAREER001","password":"Test1234!"}'
$sh = @{ Authorization = "Bearer $($student.token)" }
$me = Invoke-RestMethod -Method Get -Uri "$base/Tracer/me" -Headers $sh

if ($me.yearGraduated -and $me.permanentAddress -and $me.program -eq $canonicalProgram) {
    Write-Output ("ALREADY SEEDED: year={0} program={1} company={2}" -f `
        $me.yearGraduated, $me.program, $me.companyName)
    return
}
Write-Output ("STALE ROW: year={0} permanent={1} program={2} - refreshing" -f `
    $me.yearGraduated, $me.permanentAddress, $me.program)

# --- Delete the stale/old row (admin, SuperAdmin) ------------------------
$admin = Invoke-RestMethod -Method Post -Uri "$base/admin/login" `
    -ContentType 'application/json' `
    -Body '{"username":"careertest","password":"Test1234!"}'
$ah = @{ Authorization = "Bearer $($admin.token)" }

$found = Invoke-RestMethod -Method Get `
    -Uri "$base/Tracer/responses?page=1&search=CAREER001" -Headers $ah
$row = $found.items |
    Where-Object { $_.studentNumber -eq 'CAREER001' } |
    Select-Object -First 1
if ($row) {
    $del = Invoke-RestMethod -Method Delete `
        -Uri "$base/Tracer/responses/$($row.id)" -Headers $ah
    Write-Output "DELETED: $($del.message)"
} else {
    Write-Output 'DELETED: no existing row (fresh database)'
}

# --- Submit the full replacement -----------------------------------------
# CAREER001's story stays consistent with the original row: employed full-
# time at ACME Corp as a developer, job highly related to the course.
$answers = @{
    currentStep = 5; program = 'BSIT'; yearGraduated = 2023
    sex = 'Male'; contactNo = '09171234567'; emailOrFb = 'career001@test.com'
    permanentAddress = '18 Mabini St, Brgy. Poblacion, Makati City'
    presentAddress = 'Quezon City'
    employmentStatus = 'Employed (Full-time)'
    companyName = 'ACME Corp'; position = 'Developer'; companyType = 'Private'
    salaryBand = '20k-30k'; monthsToJob = '1-3'; jobSource = 'Online'
    courseRelatedness = 'Highly Related'
    courseRelatednessComment = 'Daily C# development uses our coursework directly.'
    skillsUsed = 'Major Subjects,Computer / Technical'
    skillsWanted = 'More hands-on capstone projects'
    satisfied = 'Yes'; wouldRecommend = 'Yes'
} | ConvertTo-Json

$submit = Invoke-RestMethod -Method Post -Uri "$base/Tracer/submit" `
    -Headers $sh -ContentType 'application/json' -Body $answers
if ($submit.message -notlike '*submitted*') {
    throw "Submit failed: $($submit.message)"
}

# --- Verify the seeded row ----------------------------------------------
$me = Invoke-RestMethod -Method Get -Uri "$base/Tracer/me" -Headers $sh
$checks = @(
    @{ n = 'yearGraduated=2023'; ok = ($me.yearGraduated -eq 2023); v = $me.yearGraduated },
    @{ n = 'permanentAddress set'; ok = ($me.permanentAddress -like '*Mabini*'); v = $me.permanentAddress },
    @{ n = 'program canonical'; ok = ($me.program -eq $canonicalProgram); v = $me.program },
    @{ n = 'company=ACME Corp'; ok = ($me.companyName -eq 'ACME Corp'); v = $me.companyName },
    @{ n = 'relatedness=Highly Related'; ok = ($me.courseRelatedness -eq 'Highly Related'); v = $me.courseRelatedness }
)
$failures = 0
foreach ($c in $checks) {
    $mark = 'PASS'; if (-not $c.ok) { $mark = 'FAIL'; $failures++ }
    Write-Output ("{0} {1} :: {2}" -f $mark, $c.n, $c.v)
}
Write-Output ("FAILURES=" + $failures)
if ($failures -gt 0) { exit 1 }
