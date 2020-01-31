/* global test expect */
"use strict"

const util = require("./util")
const isUrl = util.isUrl
const urls = [["google.com", true, "No www."],
    ["h%^*&TD{yfsd^.com", false, "Invalid characters"],
    ["localhost", true, "Localhost"],
    ["localhost:555", true, "Localhost with port"],
    ["127.0.0.1", true, "Loopback"],
    ["hoi:test@hoi.com", false, "A username and password in url"],
    ["www.youtube.com/test?id=1&uid=1", true, "2 get parameters"],
    ["192.168.2.5:25000", true, "Correct ip and port"],
    ["192.168.2.5:0002", false, "Too low port"],
    ["192.168.2.5:000", false, "Zero low port"],
    ["192.168.2.5:70002", false, "Too high port"],
    ["192.168.2.5:3", false, "Too short port"],
    ["192.168.2.5:333333", false, "Too long port"],
    ["raspberrypi/test", false, "A hostname and page"],
    ["hoi:test@www.*.com", false, "Invalid with login"],
    ["roger:@lol.com", false, "Invalid due to no password"],
    ["roger@lol.com", true, "Username only but valid"],
    ["hoi@test@hoi.com", false, "Double @ sign is invalid"]]
for (let i = 0; i < urls.length; i++) {
    test(`test url: ${urls[i][0]}, testing: ${urls[i][2]}`, () => {
        expect(isUrl(urls[i][0])).toBe(urls[i][1])
    })
}
