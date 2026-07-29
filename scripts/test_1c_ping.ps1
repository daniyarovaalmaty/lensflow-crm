$user = "Главный Бухгалтер"
$pass = "5555"
$bytes = [Text.Encoding]::UTF8.GetBytes("${user}:${pass}")
$cred = [Convert]::ToBase64String($bytes)
$headers = @{
    Authorization = "Basic $cred"
    "Content-Type" = "text/xml; charset=utf-8"
    "SOAPAction" = "http://www.1c.ru/SSL/Exchange_2_0_1_6#Exchange_2_0_1_6:Ping"
}

$body = '<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://www.1c.ru/SSL/Exchange_2_0_1_6"><soap:Body><tns:Ping/></soap:Body></soap:Envelope>'

try {
    $r = Invoke-WebRequest -Uri "https://1cstart.itsheff.cloud/okeyvizhenjb94v/ws/Exchange_2_0_1_6" -Headers $headers -Method POST -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)"
    Write-Host $r.Content
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode.value__)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    Write-Host $reader.ReadToEnd()
}
