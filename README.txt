This branch is created to restructure the code.

Following URLS are going to be replaced:

PROFILE
old: https://holaconnect.com/api/service/checkLead  -> POST
new:                            /api/profile/checklead

old: https://holaconnect.com/api/leads/_id/5873a2a97fb9d62cbcc1896b -> GET
new:                        /api/profile/info/:leadId  -> GET


SHORTLIST
old: https://holaconnect.com/api/service/updateShortlist -> POST
new:                        /api/shortlist/updateshortlist -> POST

old: https://holaconnect.com/api/shortlists/delete/_id/589da455b3ce75147b7d8262 -> PUT
new:                        /api/shortlist/:shortlistId -> delete

old: https://holaconnect.com/api/shortlists/_id/589da385a7c8ec14ba8d0bd5  -> PUT
new:                        /api/shortlist/:shortlistId -> PUT

old: https://holaconnect.com/api/shortlists/userId/58655f970a0959787dd4906a -> GET
new:                            /shortlist/ -> GET

old: https://holaconnect.com/api/service/csv/58655f970a0959787dd4906a -> GET
new:                        /api/shorlist/csv -> GET

AUTH

old: https://holaconnect.com/api/users/profile -> GET
new:                        /auth/profile/ -> GET

ACCOUNT:
old: https://holaconnect.com/api/users/account -> GET
new:                        /api/account/ -> GET
