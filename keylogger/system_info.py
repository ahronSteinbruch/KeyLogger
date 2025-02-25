import logging
import platform
import psutil
import socket
import json
from datetime import datetime

logger = logging.getLogger(__name__)


def get_cpu_info():
    cpu_info = {
        "processor": platform.processor(),
        "physical_cores": psutil.cpu_count(logical=False),
        "total_cores": psutil.cpu_count(logical=True),
        "max_frequency": (
            f"{psutil.cpu_freq().max:.2f}Mhz" if psutil.cpu_freq() else "Unknown"
        ),
    }
    return cpu_info


def get_memory_info():
    memory = psutil.virtual_memory()
    return {
        "total": f"{memory.total / (1024**3):.2f} GB",
        "available": f"{memory.available / (1024**3):.2f} GB",
        "percent_used": f"{memory.percent}%",
    }


def get_disk_info():
    disks = []
    for partition in psutil.disk_partitions():
        try:
            partition_usage = psutil.disk_usage(partition.mountpoint)
            disk_info = {
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "filesystem_type": partition.fstype,
                "total_size": f"{partition_usage.total / (1024**3):.2f} GB",
                "used": f"{partition_usage.used / (1024**3):.2f} GB",
                "free": f"{partition_usage.free / (1024**3):.2f} GB",
            }
            disks.append(disk_info)
        except Exception:
            continue
    return disks


def get_network_info():
    network_info = {
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),
        "network_adapters": [],
    }

    for interface, addresses in psutil.net_if_addrs().items():
        # Skip interfaces that are not connected or loopback
        if interface == "lo" or not addresses:
            continue

        adapter_info = {"name": interface, "addresses": []}
        for addr in addresses:
            if addr.family == socket.AF_INET:  # IPv4
                adapter_info["addresses"].append(
                    {
                        "ip": addr.address,
                        "netmask": addr.netmask,
                    }
                )
        if adapter_info["addresses"]:  # Only add adapters with IPv4 addresses
            network_info["network_adapters"].append(adapter_info)

    return network_info


def get_system_info():
    try:
        system_info = {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "os_name": platform.system(),
                "os_version": platform.version(),
                "os_architecture": platform.architecture()[0],
                "machine": platform.machine(),
                "processor": platform.processor(),
            },
            "cpu": get_cpu_info(),
            "memory": get_memory_info(),
            "disks": get_disk_info(),
            "network": get_network_info(),
            "users": get_users(),
            "pc_name": get_pc_name(),
        }
        return system_info
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        return {}


def get_users():
    return list(set([user.name for user in psutil.users()]))


def get_pc_name():
    """Get the name of the PC, for example: DESKTOP-1234567 in Windows"""
    return platform.node()


if __name__ == "__main__":
    system_info = get_system_info()
    print(json.dumps(system_info, indent=4))
