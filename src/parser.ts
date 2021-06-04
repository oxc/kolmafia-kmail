import * as CSSselect from "css-select";
import {parseDocument} from "htmlparser2";
import {filter, findOne, findOneChild, getOuterHTML, getSiblings, getText, isComment, isTag, isText} from "domutils";
import {Comment, Element, Node} from "domhandler/lib/node";
import {extractItems, extractMeat} from "kolmafia";
import {KMessage, Player} from "./kmessage";

export function parseFolder(html: string) {
  const doc = parseDocument(html, {
    decodeEntities: true,
  });
  const topElements = doc.children.filter(isTag);

  const title = CSSselect.selectOne('center > table tr > td[align=center][bgcolor=blue] > b', topElements);
  if (!title) throw new Error('Cannot find messages page title');
  const titleMeta = parseTitle(getText(title));
  if (!titleMeta) throw new Error('Cannot parse messages page title');

  const messageRows = CSSselect.selectAll('tr:has(> td > input:checkbox[name^=sel])', topElements);

  const messages = messageRows.map(messageRow => {
    const messageId = CSSselect.selectOne('td > input:checkbox', messageRow)!.attribs['name'].slice(3); // trim ^sel

    let from: Player | undefined;
    let to: Player | undefined;
    const fromTo = CSSselect.selectOne('b:first-of-type', messageRow)!;
    const correspondent = CSSselect.selectOne('a[href^=showplayer.php]', messageRow);
    if (correspondent) {
      const name = getText(correspondent);
      const id = getText(correspondent.nextSibling!).replace(/^\s*\(#(\d+)\)\s*\[/, '$1');
      const player: Player = {name, id};
      const direction = getText(fromTo).trim();
      if (direction === 'To') {
        to = player;
      } else if (direction === 'From') {
        from = player;
      } else {
        throw new Error('Who sent this message??');
      }
    } else {
      from = {name: getText(fromTo).trim()};
    }

    const date = new Date((filter(isComment, messageRow, true, 1)[0] as Comment).data);
    if (date.getFullYear() < 2003) {
      date.setFullYear(date.getFullYear()+100);
    }

    const body = CSSselect.selectOne('blockquote', messageRow)!;

    const attachmentHtml = `<div>${getOuterHTML(CSSselect.selectAll('center', body))}</div>`;

    const { text: outsideNote } = parseBodyText(body.children);

    let insideNote: string | undefined;
    const insideNoteLabel = findOne((node) => isTag(node) && node.tagName == 'p' && getText(node) === 'Inside Note:', body.children);
    if (insideNoteLabel) {
      const insideBody = CSSselect.selectOne('+ p', insideNoteLabel) as Element;
      const { text } = parseBodyText(insideBody.children);
      insideNote = text;
    }

    return { messageId, from, to, date, attachmentHtml, outsideNote, insideNote };
  });

  return { ...titleMeta, messages }
}

const reTitle = /Messages: (\w+), page (\d+) \((?:(no|\d+) messages|(\d+) - (\d+) of (\d+))\)/

function parseTitle(text: string) {
  const match = reTitle.exec(text);
  if (!match) {
    return undefined;
  }
  const folder = match[1];
  const page = Number(match[2]);
  const messageCount = Number(match[3] === 'no' ? 0 : match[3] ?? match[6]);
  const firstMessage = match[4] ? Number(match[4]) : messageCount === 0 ? undefined : 1;
  const lastMessage = match[5] ? Number(match[5]) : messageCount === 0 ? undefined : messageCount;
  return { folder, page, messageCount, firstMessage, lastMessage };
}

function parseBodyText(nodes: Node[]): { lastNode: Node | undefined; text: string } {
  let text = '';
  let skip = 0;
  let lastNode: Node | undefined;
  for (const node of nodes) {
    lastNode = node;
    if (skip > 0) {
      skip--;
      continue;
    }
    if (isText(node)) {
      text += node.data.replace(/\n/, ' ');
      continue;
    }
    if (!isTag(node)) {
      continue;
    }
    if (CSSselect.is(node, `a[href]:has(> font[color=blue]:contains("[link]"))`)) {
      if (node.nextSibling && isText(node.nextSibling)) {
        const followingText = node.nextSibling.data;
        const unchunked = unchunkLink(node.attribs.href, followingText);
        if (unchunked) {
          text += unchunked.replace(/\n/, ' ');
          skip++;
          continue;
        }
      }
    }
    if (CSSselect.is(node, `a[href^=showplayer.php]`)) {
      text += getText(node).replace(/\n/, ' ');
      continue;
    }
    if (node.tagName == 'br') {
      text += '\n';
      continue;
    }
    if (node.tagName === 'center') {
      // just ignore centers for now, this helps with valentine cards etc.
      continue;
    }
    break;
  }

  return { text, lastNode };
}

export function unchunkLink(href: string, followingText: string): string | undefined {
  let match: RegExpExecArray | null;
  let unchunked = href;
  const r = /(\S+)(?: |$)/g;
  while (match = r.exec(followingText)) {
    const text = match[1];
    if (unchunked.length > text.length) {
      if (!unchunked.startsWith(text)) {
        return undefined;
      }
      unchunked = unchunked.substring(text.length);
      continue;
    }
    if (unchunked && !text.startsWith(unchunked)) {
      return undefined;
    }
    const remainder = followingText.substring(match.index + unchunked.length);
    return href + remainder;
  }
}