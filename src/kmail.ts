import {dump, extractItems, extractMeat, myId, myName, print, printHtml, visitUrl} from "kolmafia";
import {KItem, KMessage, Player} from "./kmessage";
import {parseFolder as parseFolderHtml} from "./parser";

function parseAttachments(html: string) {
  const meat = extractMeat(html);
  const itemCount = extractItems(html);
  const items: KItem[] = [];
  Object.keys(itemCount).forEach((item => {
    items.push({
      item: Item.get(item),
      count: itemCount[item],
    })
  }))
  return { items, meat };
}

type FolderListing = {
  messages: KMessage[];
  folder: string;
  page: number;
  messageCount: number;
  firstMessage?: number;
  lastMessage?: number;
}

class Folder {
  constructor(private readonly folder: string) {
  }

  list(perPage: 10|20|50|100 = 100, page?: number): FolderListing {
    let url = `messages.php?box=${this.folder}`;
    if (perPage) {
      url += `&per_page=${perPage / 10}`;
    }
    if (page) {
      url += `&begin=${page}`
    }
    const html = visitUrl(url, false);
    const { messages: messageRows, ...meta } = parseFolderHtml(html);
    const messages = messageRows.map(row => {
      const { attachmentHtml, from, to, messageId, date, outsideNote, insideNote } = row;

      const { meat, items } = parseAttachments(attachmentHtml);

      const me: Player = {
        name: myName(),
        id: myId(),
      };
      const sender = from ?? me;
      const recipient = to ?? me;

      return new KMessage(messageId, this.folder, sender, recipient, date, outsideNote, insideNote, items, meat);
    });
    return {
      messages,
      ...meta,
    }
  }

  delete(...messages: KMessage[]) {
    if (!messages.length) {
      return
    }
    let url = `messages.php?box=${this.folder}&pwd&the_action=delete`
    for (const message of messages) {
      if (message.folder != this.folder) {
        throw new Error("Can only delete messages from the same folder")
      }
      url += `&sel${message.id}=1`
    }
    visitUrl(url, true, true);
  }
}

export class KMail {
  public static readonly inbox = new Folder('Inbox')
  public static readonly outbox = new Folder('Outbox')
  public static readonly saved = new Folder('Saved')
  public static readonly pvp = new Folder('PvP')
}

export function main(): void {
  const { messages, folder, messageCount } = KMail.inbox.list();
  messages.forEach(m => printHtml(m.printString().replace(/^ /mg, '&nbsp;').replace(/\n/g, '<br>')))
}
