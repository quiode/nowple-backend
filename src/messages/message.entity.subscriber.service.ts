import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Subject } from 'rxjs';
import { Message } from 'src/entities/message.entity';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent, TransactionCommitEvent, Connection, Repository } from 'typeorm';
import { RecoverEvent } from 'typeorm/subscriber/event/RecoverEvent';
import { SoftRemoveEvent } from 'typeorm/subscriber/event/SoftRemoveEvent';

export interface eventType {
    type: 'INSERT' | 'REMOVE' | 'SOFT_REMOVE' | 'UPDATE' | 'RECOVER' | 'TRANSACTION_COMMIT',
    event: InsertEvent<Message> | RemoveEvent<Message> | SoftRemoveEvent<Message> | UpdateEvent<Message> | RecoverEvent<Message> | TransactionCommitEvent,
}

@Injectable()
export class MessageEntitySubscriberService implements EntitySubscriberInterface<Message> {
    private readonly messageChangeEvent = new Subject<eventType>();
    constructor(@InjectConnection() readonly connection: Connection) {
        connection.subscribers.push(this);
    }

    /**
 * Indicates that this subscriber only listen to Message events.
 */
    listenTo() {
        return Message
    }

    afterInsert(event: InsertEvent<Message>): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'INSERT',
            event: event
        });
    }

    afterRemove(event: RemoveEvent<Message>): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'REMOVE',
            event: event
        });
    }

    afterSoftRemove(event: SoftRemoveEvent<Message>): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'SOFT_REMOVE',
            event: event
        });
    }

    afterUpdate(event: UpdateEvent<Message>): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'UPDATE',
            event: event
        });
    }

    afterRecover(event: RecoverEvent<Message>): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'RECOVER',
            event: event
        });
    }

    afterTransactionCommit(event: TransactionCommitEvent): void | Promise<any> {
        this.messageChangeEvent.next({
            type: 'TRANSACTION_COMMIT',
            event: event
        });
    }

    getMessageChangeEvent() {
        return this.messageChangeEvent.asObservable();
    }
}