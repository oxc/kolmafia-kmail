export interface Player {
  readonly name: string,
  readonly id?: string,
}

export interface KItem {
  readonly item: Item,
  readonly count: number;
}

export class KMessage {
  constructor(
    readonly id: string,
    readonly folder: string,
    readonly sender: Player,
    readonly recipient: Player,
    readonly date: Date,
    readonly outsideNote: string,
    readonly insideNote: string | undefined,
    readonly items: KItem[],
    readonly meat: number) {
  }

  get message(): string {
    if (this.insideNote) {
      return `${this.outsideNote}\n\nInside Note:\n\n${this.insideNote}`;
    }
    return this.outsideNote;
  }

  toString(): string {
    return `KMessage in [${this.folder}] from ${this.sender.name} (#${this.sender.id}) to ${this.recipient.name} (#${this.recipient.id}) on ${this.date}`;
  }

  printString(): string {
    return `
=========================
From: ${this.sender.name} (#${this.sender.id})
To: ${this.recipient.name} (#${this.recipient.id})
Date: ${this.date}
Folder: ${this.folder}
MessageId: ${this.id}
Body:
  ${this.message.split(/\n/).join('\n  ')}\
${!this.items?.length ? '' : '\nItems:\n  ' + this.items.map(i => `${i.item.name} (${i.count})`).join('\n  ')}\
${!this.meat ? '' : `\nMeat: \n  ${this.meat}`}
=========================`
  }
}