# Ansible-dynamic-inventory-EC2-apache


[![Build](https://travis-ci.org/joemccann/dillinger.svg?branch=master)](https://travis-ci.org/joemccann/dillinger)


Simple ansible dynamic inventory EC2 creation with apache. In this demo, we will utilize [Dynamic inventory](https://docs.ansible.com/ansible/latest/user_guide/intro_dynamic_inventory.html) feature of Ansible to track the details of newly created instances and deploy a sample HTML website to these EC2 instances. Often an Ansible inventory(static) fluctuates over time, with hosts spinning up and shutting down in response to business demands and the static inventory solutions will not be able to serve the needs. You may need to track hosts for multiple instances and it can be hectic to manage the inventory file each time.Hence, to overcome this we can make use of the option dynamic inventory to get the details of the instances and provison the EC2 according to the requirements.

## Overview 

We will be provisioning the following :

- Provision an SSH keypair, security groups and EC2 instance through Ansible.
- Retrieve the IP Address of instance using dynamic inventory concept.
- Configuring the web server through Ansible.


## Prerequisite
-----
- Need to install ansible2 on Master node to run
- AWS CLI Programmatic user
- python3
- python3-pip
- boto3
- awscli with latest version 
-----

### Ansible installation 

```sh
amazon-linux-extras install epel -y
amazon-linux-extras install ansible2 -y
yum install python3
yum install python3-pip
pip install awscli --upgrade
ansible-galaxy collection install amazon.aws
pip3 install boto3
pip3 install boto
pip3 install botocore
```
> You need to verify the localhost ansible is now able to communicate with python3. For verify

```sh
$ ansible -i hosts localhost -m setup | grep "ansible_python_version"
        "ansible_python_version": "3.7.10"
 ```
<center><img alt="infra" src="1 vbpfj_ytmt7Pm4U0oW-oSw.jpeg"> </img></center>

### Behind the code : main.yml
```sh
---

- name: "Creating AWS Simple Infra Using Ansible Playbook"
  hosts: localhost
  vars:
    project: "OLA"
    instance_type: "t2.micro"
    instance_ami: "ami-0e0ff68cb8e9a188a"
  environment:
    AWS_ACCESS_KEY: "AKIASH75KEPN43FJ"
    AWS_SECRET_KEY: "aPXYPZjpC4Vlm9yXShH/kE/Y1Lm8"
    AWS_REGION: "ap-south-1"

  tasks:

    - name: " AWS Infra - Creating KEYPAIR FOR ssh access"
      amazon.aws.ec2_key:
        name: "{{project}}"
        state: present
        tags:
          Name: "{{ project }}"
          project: "{{ project }}"

      register: keypair_status


    - name: "AWS Infra - Saving the keypair private Part Of {{ project }}.pem to local PC"
      when: keypair_status.changed == true
      copy:
        content: "{{ keypair_status.key.private_key}}"
        dest: "{{ project }}.pem"
        mode: 0400

    - name:  "AWS Infra - Creating webserver security group"
      amazon.aws.ec2_group:
        name: "{{ project }}-webserver"
        description: "allows 80,443 "

        rules:
          - proto: tcp
            from_port: 80
            to_port: 80
            cidr_ip: 0.0.0.0/0

          - proto: tcp
            from_port: 443
            to_port: 443
            cidr_ip: 0.0.0.0/0
        tags:
          Name: "{{ project }}-webserver"
          project: "{{ project }}"
      register: webserver

    - name:  " AWS Infra - Creating another remote security group"
      amazon.aws.ec2_group:
        name: "{{ project }}-remote"
        description: "allows 22 for ssh"

        rules:
          - proto: tcp
            from_port: 22
            to_port: 22
            cidr_ip: 0.0.0.0/0

        tags:
          Name: "{{ project }}-remote"
          project: "{{ project }}"
      register: remote


    - name:  " AWS Infra - Creating Ec2 Instance for Installing the webserver"
      amazon.aws.ec2:
        key_name: "{{ keypair_status.key.name}}"
        instance_type: "{{ instance_type }}"
        image: "{{ instance_ami }}"
        wait: yes
        group_id:
          - "{{ webserver.group_id }}"
          - "{{ remote.group_id }}"
        instance_tags:
          Name: "{{ project }}-webserver"
          project: "{{ project }}"
        count_tag:
          Name: "{{ project }}-webserver"
        exact_count: 2
      register: if_ec2_status

    - name: "AWS Infra - Creating Dynamic Inventory for the EC2 creation"
      add_host:
        name: "{{ item.public_ip }}"
        groups: "amazon"
        ansible_host: "{{ item.public_ip }}"
        ansible_port: 22
        ansible_user: "ec2-user"
        ansible_ssh_private_key_file: "{{ project }}.pem"
        ansible_ssh_common_args: "-o StrictHostKeyChecking=no"
      with_items:
        - "{{ if_ec2_status.tagged_instances }}"

    -  name: "AWS Infra - Waiting for instances to become Online. Please wait"
       when: if_ec2_status.changed == true
       wait_for:
         timeout: 90


- name: " AWS Infra - Ec2 Instances Provisioning"
  hosts: amazon
  become: true
  tasks:

    - name: "AWS Infra - Installing apache webserver"
      yum:
        name: httpd
        state: present

    - name: "AWS Infra - Creating simple index.html"
      copy:
        content: "<center><h1> Welcome back {{ ansible_hostname }}</h1></center>"
        dest: /var/www/html/index.html

    - name: "AWS Infra - restart and enable httpd"
      service:
        name: httpd
        state: restarted
        enabled: true

    - name: "AWS Infra - Website - url for check"
      run_once: true
      debug:
        msg: "http://{{item}}"
      with_items:
        - "{{ groups.amazon }}"
   ```
   
   ### Sample output while running the playbook

```sh
~]$ ansible-playbook -i hosts main.yml

PLAY [Creating AWS Simple Infra Using Ansible Playbook] ****************************************************************************************************************

TASK [Gathering Facts] *************************************************************************************************************************************************
ok: [localhost]

TASK [AWS Infra - Creating KEYPAIR FOR ssh access] *********************************************************************************************************************
changed: [localhost]

TASK [AWS Infra - Saving the keypair private Part Of OLA.pem to local PC] **********************************************************************************************
changed: [localhost]

TASK [AWS Infra - Creating webserver security group] *******************************************************************************************************************
changed: [localhost]

TASK [AWS Infra - Creating another remote security group] **************************************************************************************************************
changed: [localhost]

TASK [AWS Infra - Creating Ec2 Instance for Installing the webserver] **************************************************************************************************
changed: [localhost]

TASK [AWS Infra - Creating Dynamic Inventory for the EC2 creation] *****************************************************************************************************
changed: [localhost] => (item={u'ramdisk': None, u'kernel': None, u'root_device_type': u'ebs', u'private_dns_name': u'ip-172-31-39-190.ap-south-1.compute.internal', u'block_device_mapping': {u'/dev/xvda': {u'status': u'attached', u'delete_on_termination': True, u'volume_id': u'vol-0265addf98aebb093'}}, u'key_name': u'OLA', u'public_ip': u'3.110.157.83', u'image_id': u'ami-0e0ff68cb8e9a188a', u'tenancy': u'default', u'private_ip': u'172.31.39.190', u'groups': {u'sg-0fe812ca375faf1ef': u'OLA-remote', u'sg-0fe5299ac58ba9ec1': u'OLA-webserver'}, u'public_dns_name': u'ec2-3-110-157-83.ap-south-1.compute.amazonaws.com', u'state_code': 16, u'id': u'i-03972bd8edd6d455b', u'tags': {u'project': u'OLA', u'Name': u'OLA-webserver'}, u'placement': u'ap-south-1a', u'ami_launch_index': u'1', u'dns_name': u'ec2-3-110-157-83.ap-south-1.compute.amazonaws.com', u'region': u'ap-south-1', u'ebs_optimized': False, u'launch_time': u'2022-03-12T11:06:21.000Z', u'instance_type': u't2.micro', u'state': u'running', u'root_device_name': u'/dev/xvda', u'hypervisor': u'xen', u'virtualization_type': u'hvm', u'architecture': u'x86_64'})

changed: [localhost] => (item={u'ramdisk': None, u'kernel': None, u'root_device_type': u'ebs', u'private_dns_name': u'ip-172-31-46-166.ap-south-1.compute.internal', u'block_device_mapping': {u'/dev/xvda': {u'status': u'attached', u'delete_on_termination': True, u'volume_id': u'vol-0ac6d29e3de131d86'}}, u'key_name': u'OLA', u'public_ip': u'13.232.210.242', u'image_id': u'ami-0e0ff68cb8e9a188a', u'tenancy': u'default', u'private_ip': u'172.31.46.166', u'groups': {u'sg-0fe812ca375faf1ef': u'OLA-remote', u'sg-0fe5299ac58ba9ec1': u'OLA-webserver'}, u'public_dns_name': u'ec2-13-232-210-242.ap-south-1.compute.amazonaws.com', u'state_code': 16, u'id': u'i-0e8a5e50b0f1a3d7b', u'tags': {u'project': u'OLA', u'Name': u'OLA-webserver'}, u'placement': u'ap-south-1a', u'ami_launch_index': u'0', u'dns_name': u'ec2-13-232-210-242.ap-south-1.compute.amazonaws.com', u'region': u'ap-south-1', u'ebs_optimized': False, u'launch_time': u'2022-03-12T11:06:21.000Z', u'instance_type': u't2.micro', u'state': u'running', u'root_device_name': u'/dev/xvda', u'hypervisor': u'xen', u'virtualization_type': u'hvm', u'architecture': u'x86_64'})

TASK [AWS Infra - Waiting for instances to become Online. Please wait] *************************************************************************************************
ok: [localhost]

PLAY [AWS Infra - Ec2 Instances Provisioning] **************************************************************************************************************************

TASK [Gathering Facts] *************************************************************************************************************************************************
ok: [3.110.157.83]
ok: [13.232.210.242]

TASK [AWS Infra - Installing apache webserver] *************************************************************************************************************************
changed: [3.110.157.83]
changed: [13.232.210.242]

TASK [AWS Infra - Creating simple index.html] **************************************************************************************************************************
changed: [3.110.157.83]
changed: [13.232.210.242]

TASK [AWS Infra - restart and enable httpd] ****************************************************************************************************************************
changed: [3.110.157.83]
changed: [13.232.210.242]

TASK [AWS Infra - Website - url for check] *****************************************************************************************************************************
ok: [3.110.157.83] => (item=3.110.157.83) => {
    "msg": "http://3.110.157.83"                        >>>>>>>>>>>>>>>>>>>>>> Here is the url to check the site 
}
ok: [3.110.157.83] => (item=13.232.210.242) => {
    "msg": "http://13.232.210.242"
}

PLAY RECAP *************************************************************************************************************************************************************
13.232.210.242             : ok=4    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
3.110.157.83               : ok=5    changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
localhost                  : ok=8    changed=6    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
```



 ## Conclusion

Created the EC2, secuirty group, keypair, tags , and apache using dynamic inventory via Ansible playbook


#### ⚙️ Connect with Me

<p align="center">
<a href="mailto:jomyambattil@gmail.com"><img src="https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white"/></a>
<a href="https://www.linkedin.com/in/jomygeorge11"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"/></a> 
<a href="https://www.instagram.com/therealjomy"><img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white"/></a><br />
