import json
import os
import boto3
import logging
import urllib.request

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sns_client = boto3.client('sns')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://13.206.223.86:3000')

def lambda_handler(event, context):
    """
    AWS Lambda worker triggered asynchronously by SQS messages.
    Processes ticket booking, updates ticket status to CONFIRMED in DB,
    and publishes confirmation notices via SNS.
    """
    logger.info("Received event: %s", json.dumps(event))
    
    records = event.get('Records', [])
    processed_count = 0
    errors = []

    for record in records:
        try:
            body_str = record.get('body', '{}')
            payload = json.loads(body_str)
            
            ticket_id = payload.get('ticket_id')
            ticket_code = payload.get('ticket_code', 'UNKNOWN')
            event_title = payload.get('event_title', 'University Event')
            attendee_name = payload.get('attendee_name', 'Valued Attendee')
            attendee_email = payload.get('attendee_email', 'N/A')
            quantity = payload.get('quantity', 1)
            event_date = payload.get('event_date', 'See Event Details')
            event_location = payload.get('event_location', 'Campus Hall')

            logger.info(f"Processing ticket reservation: Code={ticket_code}, Attendee={attendee_name}")

            # 1. Update ticket status to CONFIRMED in RDS MySQL via Express API
            if ticket_id:
                try:
                    confirm_url = f"{API_BASE_URL}/api/tickets/{ticket_id}/confirm"
                    req = urllib.request.Request(confirm_url, method='PATCH')
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        logger.info(f"Ticket {ticket_id} status updated to CONFIRMED. HTTP {resp.status}")
                except Exception as update_err:
                    logger.warning(f"Could not update status via API: {update_err}")

            # 2. Compose confirmation message body
            message_body = (
                f"🎟️ EVENT TICKET CONFIRMATION\n"
                f"-----------------------------------------\n"
                f"Hello {attendee_name},\n\n"
                f"Your registration for '{event_title}' is CONFIRMED!\n\n"
                f"Ticket Code : {ticket_code}\n"
                f"Seats       : {quantity}\n"
                f"Date        : {event_date}\n"
                f"Location    : {event_location}\n"
                f"Email       : {attendee_email}\n\n"
                f"Please present this confirmation at the venue entrance.\n"
                f"University Cloud Event Management System"
            )

            # 3. Publish to SNS Topic (fans out to registered emails / team)
            if SNS_TOPIC_ARN:
                sns_response = sns_client.publish(
                    TopicArn=SNS_TOPIC_ARN,
                    Subject=f"Ticket Confirmed: {event_title} [{ticket_code}]",
                    Message=message_body,
                    MessageAttributes={
                        'TicketCode': {
                            'DataType': 'String',
                            'StringValue': ticket_code
                        },
                        'AttendeeEmail': {
                            'DataType': 'String',
                            'StringValue': attendee_email
                        }
                    }
                )
                logger.info(f"SNS message published successfully. MessageId: {sns_response.get('MessageId')}")

            processed_count += 1

        except Exception as e:
            logger.error("Error processing SQS record: %s", str(e), exc_info=True)
            errors.append(str(e))

    return {
        'statusCode': 200 if not errors else 207,
        'body': json.dumps({
            'processed': processed_count,
            'errors': errors
        })
    }
