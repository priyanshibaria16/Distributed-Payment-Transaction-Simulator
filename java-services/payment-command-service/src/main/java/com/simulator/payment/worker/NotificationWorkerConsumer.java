package com.simulator.payment.worker;

import com.simulator.payment.model.event.NotificationEvent;
import jakarta.jms.JMSException;
import jakarta.jms.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

@Component
public class NotificationWorkerConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationWorkerConsumer.class);
    private final JdbcTemplate jdbcTemplate;

    public NotificationWorkerConsumer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @JmsListener(destination = "${simulator.queues.notification:notification.queue}",
                 containerFactory = "jmsListenerContainerFactory")
    public void onNotification(NotificationEvent event, Message jmsMessage) {
        log.info(">>> [SIMULATED NOTIFICATION] type={}, txn={}, recipient={}, amount={} {}, message='{}'",
                event.getType(), event.getTransactionId(), event.getRecipientUserId(),
                event.getAmount(), event.getCurrency(), event.getMessage());

        try {
            // Record audit log for simulated notification
            String sql = """
                INSERT INTO audit_logs (entity_type, entity_id, action, performed_by, details)
                VALUES ('NOTIFICATION', ?, ?, 'SYSTEM', json_build_object(
                    'type', ?::text,
                    'message', ?::text,
                    'amount', ?::numeric
                ))
            """;
            jdbcTemplate.update(sql,
                    event.getTransactionId() != null ? event.getTransactionId() : "N/A",
                    event.getType().name(),
                    event.getType().name(),
                    event.getMessage(),
                    event.getAmount());

            jmsMessage.acknowledge();
        } catch (JMSException e) {
            log.error("Failed to acknowledge notification message: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Failed to insert notification audit log: {}", e.getMessage());
        }
    }
}
