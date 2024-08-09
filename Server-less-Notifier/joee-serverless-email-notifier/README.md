# serverless-email-notifier
Simple repository about a service that takes care of email notifications using the serverless framework, AWS, Lambda and Node.js.
# How to make it work
- Clone this repository
- Install Node.js
- On your terminal, type "npm i serverless"
- Create a secrets.json file in the root directory
- Create an AWS account
- Validate an email using the SES service in you AWS account
- Fill the secrets.json file with the validated email and the aws region of your account
- On your terminal, type "serverless deploy"
- You can wait for the cron scheduler to send the email or you can test both functions by invoking them using (on your terminal) "serverless invoke --function weekendReminder --log" and/or "serverless invoke --function dailyReminder --log"