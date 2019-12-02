/* global test expect */
"use strict"

const util = require("./util")
const isUrl = util.isUrl
const urls = [["google.com", true, "No www."],
    ["h%^*&TD{yfsd^.com", false, "invalid characters"],
    ["localhost", true, "Localhost"],
    ["127.0.0.1", true, "Loopback"],
    ["hoi:test@hoi.com", true, "A username and password in url"],
    ["www.youtube.com/test?id=1&uid=1", true, "2 get parameters"],
    ["raspberrypi/test", true, "A hostname and page"],
    ["hoi:test@www.*.com", false, "invalid with login"],
    ["roger:@lol.com", false, "invalid due to no password"],
    ["roger@lol.com", true, "username only but valid"]]
// Tests for isUrl()
// Checks if the location starts with one of the following:
// - localhost
// - An ipv4 address
// - Valid domain with 0 or more subdomains
//   - subdomains can have letters, digits and hyphens
//   - hyphens cannot be at the end or the start of the subdomain
//   - top level domains can only contain letters
// After that, an optional port in the form of :22 or up to :22222
// Lastly, it checks if the location ends with one of the following:
// - Nothing
// - Single slash character with anything behind it
// - Single question mark with anything behind it
// - Single number sign with anything behind it
for (let i = 0; i < urls.length; i++) {
    test(`test url: ${urls[i][0]}, testing: ${urls[i][2]}`, () => {
        expect(isUrl(urls[i][0])).toBe(urls[i][1])
    })
}
