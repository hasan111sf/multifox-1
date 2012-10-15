/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Multifox.
 *
 * The Initial Developer of the Original Code is
 * Jeferson Hultmann <hultmann@gmail.com>
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


function copyCookieToNewHost(cookie, newHost) {
  var expiryTime = cookie.isSession ? 4611686018427388 : cookie.expiry; // Math.pow(2, 62)=4611686018427388000
  Services.cookies.add(newHost,         cookie.path,
                       cookie.name,     cookie.value,
                       cookie.isSecure, cookie.isHttpOnly, cookie.isSession, expiryTime);
}


var CookieUtils = {
  getAuthCookies: function() {
    return getAllCookiesFromHost("${INTERNAL_DOMAIN_SUFFIX_LOGGEDIN}");
  },

  getUserCookies: function(user) { // used by removeUser
    var rv = [];
    // "[*select from all hosts*]-[user@gmail.com]-[google.com]"
    var hexlogin = "-" + user.encodedName + "-" + user.encodedTld;
    this._getUserCookies(rv, hexlogin, "${INTERNAL_DOMAIN_SUFFIX_LOGGEDIN}");
    this._getUserCookies(rv, hexlogin, "${INTERNAL_DOMAIN_SUFFIX_ANON}");
    return rv;
  },

  _getUserCookies: function(rv, hexlogin, ns) {
    var all = getAllCookiesFromHost(ns);
    var cookie;
    var suffix = hexlogin + "." + ns;
    for (var idx = all.length - 1; idx > -1; idx--) {
      cookie = all[idx];
      if (endsWith(suffix, cookie.host)) {
        rv.push(cookie);
      }
    }
  }

};


function getAllCookiesFromHost(h) {
  var rv = [];
  var COOKIE = Ci.nsICookie2;

  var _qty = 0;
  var _t = new Date().getTime();

  // TODO use nsICookieManager2.getCookiesFromHost when it works properly
  var all = Services.cookies.enumerator;
  while (all.hasMoreElements()) {
    var cookie = all.getNext().QueryInterface(COOKIE);
    _qty++;
    if (hasRootDomain(h, cookie.host)) {
      rv.push(cookie);
    }
  }

  console.log("getAllCookiesFromHost", h, "time=" + (new Date().getTime() - _t) + "ms -- len parsed=" + _qty + " -- len rv=" + rv.length);
  return rv;
}


function removeCookies(all) {
  console.assert(Array.isArray(all), "all!=array");

  var tlds = [];
  var realTld;
  var realHost;
  var mgr = Services.cookies;
  var cookie;

  for (var idx = all.length - 1; idx > -1; idx--) {
    cookie = all[idx];
    mgr.remove(cookie.host, cookie.name, cookie.path, false);

    // for plugin debug
    realHost = UserUtils.getRealHost(cookie.host);
    if (realHost !== null) {
      realTld = getTldFromHost(realHost);
      if (tlds.indexOf(realTld) === -1) {
        tlds.push(realTld);
      }
    }
  }
  console.log("removeCookies n =", all.length);


  // debug info: log plugin data
  var ph = Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost);
  var pTags = ph.getPluginTags();
  for (var idx1 = pTags.length - 1; idx1 > -1; idx1--) {
    var pl = pTags[idx1];
    try {
      ph.siteHasData(pl, null);
    } catch (ex) {
      continue;
    }

    for (var idx2 = tlds.length - 1; idx2 > -1; idx2--) {
      // it seems siteHasData uses TLD anyway
      if (ph.siteHasData(pl, tlds[idx2])) {
        console.log(pl.name, "siteHasData", tlds[idx2]);
      }
    }

  }
}


function removeTldData_LS(tld) {
  // TODO del localStorage
}


function removeTldData_cookies(tld) { // TODO del ".${INTERNAL_DOMAIN_SUFFIX_ANON}" + ".${INTERNAL_DOMAIN_SUFFIX_LOGGEDIN}"
  var all = getAllCookiesFromHost(tld);
  removeCookies(all);
  return all;
}
