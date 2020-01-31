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
for (let i = 0; i < urls.length; i++) {
    test(`test url: ${urls[i][0]}, testing: ${urls[i][2]}`, () => {
        expect(isUrl(urls[i][0])).toBe(urls[i][1])
    })
}
