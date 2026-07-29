import zeep
from zeep.client import Client
import sys

wsdl_url = "https://lensflow-crm.vercel.app/api/onec/v4/ws/InterfaceVersion?wsdl"
try:
    print("Fetching and parsing WSDL with Zeep...")
    client = Client(wsdl_url)
    print("WSDL parsed successfully!")
    print("Services:")
    for service in client.wsdl.services.values():
        print(f" - {service.name}")
        for port in service.ports.values():
            print(f"   - Port: {port.name}")
            for op in port.binding._operations.values():
                print(f"     - Operation: {op.name}")
except Exception as e:
    print(f"Error parsing WSDL: {e}")
    sys.exit(1)
