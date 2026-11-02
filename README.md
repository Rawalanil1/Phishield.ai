PHISHIELD --- CyberGuard AI
Live demo: https://rawalanil1.github.io/Phishield.ai/  
Source code: https://github.com/Rawalanil1/Phishield.ai
> Browser-based cybersecurity investigation and phishing-awareness
> project. The current public deployment is primarily client-side.
> Detection is based on heuristics and evidence correlation; it is not a
> trained machine-learning classifier.
Overview
PHISHIELD (shown in the application interface as CYBERGUARD AI)
helps users investigate suspicious URLs, review domain and network
information, recognise scam patterns, and organise incident-response
evidence.
Features
URL investigation: URL parsing and heuristic checks for
suspicious characteristics such as missing HTTPS, brand terms in
unaffiliated hostnames, punycode, hyphens, look-alike patterns, and
free-hosting subdomains.
Risk assessment: risk score, confidence estimate, verdict, and
supporting evidence.
DNS reconnaissance: A, AAAA, CNAME, MX, NS, and TXT lookups
where available; SPF, DMARC, and selected common DKIM-selector
checks.
Domain intelligence: RDAP registration data when available.
IP intelligence: IP address, ASN, ISP/organisation, and
approximate location through the configured lookup.
Threat intelligence: urlscan.io search and historical
observations where available.
Page and message analysis: supplied HTML/source analysis and
scam-language pattern checks.
Investigation tools: evidence timeline, local scan history, and
report generation.
Awareness and response: Scam Lab, Phish Lab, incident-response
guidance, complaint/evidence assistance, cybercrime help resources,
and privacy controls.
Modules
Command Center
Investigate URL
Recon & DNS
Threat Intelligence
Page Behaviour
Evidence Timeline
CyberGuard AI
Scam Lab
Investigation Report
Incident Response
Complaint & Evidence
Cybercrime Help
Phish Lab
Privacy Center
Settings & Sources
A module or provider option being visible does not necessarily mean that
its external service is connected in the live deployment.
Technology
HTML5
CSS3
Vanilla JavaScript
Browser APIs: Fetch, URL, DOMParser, LocalStorage, SessionStorage,
Clipboard, and Blob/download APIs
External lookups when enabled and reachable:
Google Public DNS-over-HTTPS
RDAP
ipwho.is
urlscan.io
How it works
The user submits a URL.
The application parses and normalises the address.
Local heuristic rules inspect URL and hostname characteristics.
Configured public services are queried for DNS, registration, IP, or
URL-scan information.
Available observations are correlated into evidence.
The application displays a verdict, risk score, confidence estimate,
and investigation details.
Note: A score is an indicator based on the signals available at scan
time. It is not proof that a site is safe or malicious. Missing records
or a clean lookup do not establish trustworthiness.
Run locally
Clone the repository:
``` bash
git clone https://github.com/Rawalanil1/Phishield.ai.git
cd Phishield.ai
```
Open `index.html` in a modern browser, or run a local static server:
``` bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.
Using a local HTTP server is recommended because some browser APIs and
external services may behave differently when opened through `file://`.
GitHub Pages deployment
The project is published with GitHub Pages. Push updates to the
configured branch, check Repository Settings → Pages, and wait for
the deployment to finish.
Live application: https://rawalanil1.github.io/Phishield.ai/
Privacy and security
Investigation history and preferences are stored in browser
LocalStorage; session state may use SessionStorage.
Some submitted URLs or hostnames may be sent to third-party lookup
providers to retrieve DNS, IP, registration, or URL-scan
information.
Never submit passwords, OTPs, CVVs, banking credentials, private
tokens, or other secrets.
Third-party results may be incomplete, delayed, or inaccurate.
Browser storage is not a secure secret vault. Production API
credentials should be stored server-side, not embedded in public
frontend code.
Only investigate systems and URLs you are authorised to examine.
Current limitations
The current public deployment is primarily client-side and has no
connected production backend or central database.
Detection uses rules, patterns, and evidence correlation. It does
not currently run a trained ML model, despite the "AI" wording in
the interface.
VirusTotal, PhishTank, and URLhaus need a suitable server-side
integration; Google Safe Browsing requires an API key. Do not assume
these services are queried by the current standalone deployment.
The CyberGuard AI chat requires a connected backend model service.
Page analysis is limited by browser security restrictions and the
source content available to the application. Analysing supplied HTML
is not the same as safely crawling and executing a remote site.
DNS, RDAP, IP-geolocation, and threat-intelligence data can be
unavailable or misleading, particularly for shared hosting, CDNs,
and hosted subdomains.
This is an educational investigation aid, not a replacement for
professional incident response or verified security services.
Future improvements
Secure backend API for provider integrations and secret management.
Vetted threat-intelligence feeds with caching, source attribution,
and false-positive handling.
Maintained Public Suffix List for reliable registrable-domain
parsing.
Automated unit, integration, and security tests.
Improved accessibility, internationalisation, and mobile usability.
Responsible use
Use PHISHIELD for learning, defensive analysis, and authorised
investigations. Do not access, disrupt, or test systems without
permission. Do not visit a suspicious URL simply because it appears in a
scan result.
Author
Anil Pukhraj Rawal
GitHub: https://github.com/Rawalanil1
Project: https://github.com/Rawalanil1/Phishield.ai
Live demo: https://rawalanil1.github.io/Phishield.ai/
For bugs or suggestions, open an issue in the repository. Do not include
passwords, private information, or active harmful links in public issue
reports.
