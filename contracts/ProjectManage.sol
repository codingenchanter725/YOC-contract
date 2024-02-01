// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "./Project.sol";
import "./TokenTemplate.sol";
import "./interfaces/IYOCMasterChef.sol";
import "./interfaces/IProjectTrade.sol";
import "./utils/RestrictedAccess.sol";

contract ProjectManage is RestrictedAccess {
    using Counters for Counters.Counter;
    Counters.Counter private totalProjectCount;

    address[] private founders;
    mapping(address => address[]) public ownerToProjects; // account -> project contract addresses
    IYOCMasterChef public masterchef;
    IProjectTrade public projectTrade;

    event DeployedNewProject(
        address founderAddress,
        address contractAddress,
        address tokenAddress
    );

    constructor(address _masterchef, address _projectTrade) {
        masterchef = IYOCMasterChef(_masterchef);
        projectTrade = IProjectTrade(_projectTrade);
    }

    function createProject(
        string memory name,
        string memory symbol,
        uint256 total,
        uint8 decimals,
        uint256 sellAmount,
        string[] memory _infoST,
        uint256[] memory _infoNB,
        address[] memory _infoAddress
    ) public returns (address, address) {
        require(_infoAddress[0] != address(0), "Invalid address");

        if (ownerToProjects[msg.sender].length == 0) {
            founders.push(msg.sender);
        }

        address[] memory _infoAD = new address[](5);
        TokenTemplate newToken = new TokenTemplate(
            name,
            symbol,
            total,
            decimals,
            sellAmount,
            msg.sender
        );

        _infoAD[0] = address(newToken);
        _infoAD[1] = address(_infoAddress[0]); // YUSD
        _infoAD[2] = address(_infoAddress[1]); // projectWallet
        _infoAD[3] = address(projectTrade); // ProjectTrade
        _infoAD[4] = address(masterchef); // MasterChef

        Project newProject = new Project(_infoST, _infoNB, _infoAD, sellAmount);
        newProject.addAuthorizedUser(msg.sender);
        masterchef.addAuthorizedUser(address(newProject));
        newProject.init();
        IERC20(address(newToken)).transfer(
            address(newProject),
            IERC20(address(newToken)).balanceOf(address(this))
        );
        ownerToProjects[msg.sender].push(address(newProject));

        totalProjectCount.increment();

        emit DeployedNewProject(
            msg.sender,
            address(newProject),
            address(newToken)
        );
        return (address(newProject), address(newToken));
    }

    function getProjectContractOwner(
        address _owner
    ) public view returns (address[] memory) {
        address[] memory projects = ownerToProjects[_owner];
        return projects;
    }

    function getProjectAllContract() public view returns (address[] memory) {
        address[] memory projects = new address[](totalProjectCount.current());
        uint256 counter = 0;
        for (uint256 i = 0; i < founders.length; i++) {
            address[] memory founderProjects = ownerToProjects[founders[i]];
            for (uint ii = 0; ii < founderProjects.length; ii++) {
                projects[counter++] = founderProjects[ii];
            }
        }
        return projects;
    }

    function getAllFounders() public view returns (address[] memory) {
        return founders;
    }
}
