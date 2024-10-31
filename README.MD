# pls donate purchase header remover
it does what it says on the tin, it alters requests from Roblox to strip some headers
in particular, for any url that has "purchase" in it, the following headers are removed
if and only if Roblox-Universe-Id is set to 3317679266:
- Roblox-Game-Id
- Roblox-Place-Id
- Roblox-Universe-Id
- PlayerCount
- Requester

While the Roblox-Game-Id header is the most important for validation, I thought I'd make it
remove the others as well. By removing these headers, Roblox won't validate that the purchase
was made in PLS DONATE, meaning the player will recieve the full 70% of the robux, instead of
having 10% be given to hazem

# usage
- be a [Bloxstrap](https://github.com/bloxstraplabs/bloxstrap) user.
- have nodejs installed. im using v20.16.0 if you think you have the wrong version
- download this repository as a zip file and extract it somewhere. it really doesn't matter where lol
- run the 'setup.bat' file (you only need to do this once unless you delete the node_modules folder)
- every time you want to donate in pls donate without giving hazem money, open 'run.bat' **before opening roblox**
- once youre done just press ctrl+c with the terminal focused to close the script, it will clean up after itself.

# uh now i cant play roblox without it open
this script only modifes like two things, and they can be relatively easily reverted if the script is giving trouble.
- open the Bloxstrap fflag editor, and delete the flag "DFStringHttpCurlProxyHostAndPort" and then save
- press Windows + R and enter "%localappdata%\Bloxstrap\Modifications\ssl" and press enter
- delete 'cacert.pem' in that folder
- try opening roblox again. 
- if it still doesn't work, use the bloxstrap setting to reinstall roblox on next launch, that should fix it