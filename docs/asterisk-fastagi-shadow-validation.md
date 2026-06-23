# Asterisk FastAGI Shadow Validation

This runbook records the staging/test FastAGI shadow validation that was performed against real Asterisk/Vicidial outbound flow. It is documentation only. It does not enable FastAGI, live routing, or live caller ID.

FastAGI must remain disabled unless a controlled shadow test window is explicitly approved. Live caller ID is not enabled yet. Do not add `Set(CALLERID(num)=...)` until an approved live cutover.

## Staging Topology

- Middleware path: `/opt/vici-mw`
- Middleware public IP: `134.199.192.180`
- Middleware HTTP port: `3000`
- Middleware FastAGI port used during test only: `4573`
- Vicibox/Vicidial test server: `45.33.97.144`
- Route engine mode during validation: `shadow`
- FastAGI final safe state: disabled

The middleware does not carry call audio. Asterisk carries the call media and dialplan execution. The middleware only returns DID/caller-ID decisions for diagnostics in shadow mode and for a future approved live phase.

DIDs are owned and managed by the middleware inventory. In a future live phase, Asterisk would apply the selected caller ID after explicit approval; that behavior is not enabled by this validation.

## Tested Isolated Context

The isolated Asterisk context used for connectivity validation was:

```asterisk
[vici-mw-fastagi-shadow-test]
exten => _X.,1,NoOp(Vici Middleware FastAGI shadow test)
 same => n,AGI(agi://134.199.192.180:4573/route-outbound-shadow,${EXTEN},TESTCAMP,sim-lead,sim-list,asterisk-outbound-shadow,manual,TX)
 same => n,NoOp(Returning to existing safe staging flow with caller ID unchanged)
 same => n,Hangup()
```

Expected result: Asterisk can call `agi://134.199.192.180:4573/route-outbound-shadow`, the middleware logs a shadow route decision, and Asterisk continues without setting caller ID from the middleware response.

## Tested Real Carrier Block

The real outbound carrier context identified during the test was:

```asterisk
[vicidial-auto-external]
```

The real carrier pattern identified during the test was:

```asterisk
_31XXXXXXXXXX
```

The carrier was:

```text
Nobel Biz Outbound
```

The original real outbound dial line was:

```asterisk
Dial(SIP/29741${EXTEN:1}@nobel,,tTo)
```

During the controlled shadow test only, the FastAGI call was temporarily inserted before the real `Dial(...)` line:

```asterisk
AGI(agi://134.199.192.180:4573/route-outbound-shadow,${EXTEN:2},TESTCAMP,sim-lead,sim-list,asterisk-outbound-shadow,manual,TX)
```

No `Set(CALLERID(num)=...)` line was added. The live carrier dial remained responsible for call routing.

## Controlled Originate Tests

Controlled originates used the real outbound carrier path:

```bash
channel originate Local/312105553344@vicidial-auto-external application NoOp
channel originate Local/312815558899@vicidial-auto-external application NoOp
```

Expected Asterisk behavior:

- the FastAGI shadow line is invoked before the real outbound dial
- the real carrier path remains intact
- caller ID is not changed from the middleware response
- no `Set(CALLERID(num)=...)` is executed

## Expected Middleware Log Evidence

FastAGI shadow logs should show events with:

```text
source: asterisk-fastagi-shadow
campaign_id: TESTCAMP
client_id: Test
agent_id: asterisk-outbound-shadow
decision: shadow_selected
selected_did: populated
```

The controlled originates produced route requests with destination phones:

```text
2105553344
2815558899
```

Do not paste route tokens, session tokens, or secrets into logs, screenshots, tickets, or documentation.

## Expected Route Event Evidence

Route event diagnostics should show:

```text
source: asterisk-fastagi-shadow
campaign_id: TESTCAMP
client_id: Test
decision: shadow_selected
selected_did: populated
```

This confirms shadow DID selection only. It does not mean live caller ID routing is enabled.

## Rollback Commands

Rollback must restore the real Vicidial outbound carrier block and disable FastAGI.

On the Vicidial/Asterisk test server, restore `/etc/asterisk/extensions-vicidial.conf` from the newest timestamped backup created before the shadow insertion:

```bash
cp -a "$(ls -t /etc/asterisk/extensions-vicidial.conf.bak.vici-mw-outbound-* | head -n 1)" /etc/asterisk/extensions-vicidial.conf
asterisk -rx "dialplan reload"
asterisk -rx "dialplan show vicidial-auto-external" | grep -A5 "_31XXXXXXXXXX"
```

Confirm the real carrier block is back to the original safe sequence:

```asterisk
AGI(agi://127.0.0.1:4577/call_log)
Dial(SIP/29741${EXTEN:1}@nobel,,tTo)
Hangup()
```

On the middleware server, FastAGI must be disabled after the controlled test window:

```bash
APP=0
export FASTAGI_ENABLED=false
pm2 restart "$APP" --update-env
```

Confirm port `4573` is closed:

```bash
ss -lntp | grep ':4573' || echo "FastAGI port closed"
```

## Final Safe State

Final state after rollback:

- FastAGI disabled
- port `4573` closed
- route engine mode remains `shadow`
- real Vicidial outbound carrier restored
- no live caller ID routing enabled
- no `Set(CALLERID(num)=...)` added
- no live mode functionality enabled
- Asterisk/Vicidial outbound flow restored to the original real carrier path

## Warnings

- FastAGI must remain disabled unless running a controlled shadow test.
- Live caller ID is not enabled yet.
- Do not add `Set(CALLERID(num)=...)` until approved live cutover.
- Do not enable live route engine mode as part of shadow validation.
- Do not use public or production call flow for unapproved tests.
- Do not expose route tokens, admin tokens, session tokens, API secrets, or raw authorization headers.
- Middleware does not carry call audio; it only provides DID/caller-ID decisions.
- DIDs are owned and managed by the middleware; Asterisk applies selected caller ID only in a future approved live phase.
